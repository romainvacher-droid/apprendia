#!/usr/bin/env python3
"""
content_manager.py — Agent autonome de contenu pour Apprendia
Tourne chaque nuit (cron 1:17). Peut aussi être invoqué par le bot Telegram.

Sources de vérité :
  lib/courses.ts          → métadonnées des formations (titre, niveau, durée...)
  content/courses/{id}.json → contenu pédagogique (sections, quiz)

Infrastructure : Vercel (hébergement) + GitHub (sources) + Neon (BDD)

Usage :
  python3 content_manager.py                    → cycle nuit : ajout + génération
  python3 content_manager.py generate <id>      → génère le contenu pour la formation <id>
  python3 content_manager.py generate-all       → génère le contenu pour toutes les formations sans contenu
  python3 content_manager.py audit              → affiche le catalogue
  python3 content_manager.py status             → résumé rapide
"""
import sys, os, re, json, pathlib, subprocess, time, urllib.request, datetime

BASE_DIR      = pathlib.Path(__file__).resolve().parent.parent
COURSES_FILE  = BASE_DIR / "lib" / "courses.ts"
CONTENT_DIR   = BASE_DIR / "content" / "courses"
LOGS_DIR      = BASE_DIR / "logs"

TELEGRAM_USER_ID = "8174597010"

# ── .env ──────────────────────────────────────────────────────────────────────
def load_env():
    for p in [BASE_DIR / ".env.local", BASE_DIR / ".env",
              pathlib.Path("/root/youtube-pipeline/.env"),
              pathlib.Path("/root/.openclaw/.env")]:
        if p.exists():
            for line in p.read_text().splitlines():
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    k, _, v = line.partition('=')
                    os.environ.setdefault(k.strip(), v.strip().strip('"'))

load_env()
GROQ_KEY        = os.getenv("GROQ_API_KEY", "")
OPENROUTER_KEY  = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_KEY2 = os.getenv("OPENROUTER_API_KEY_2", "")

# ── Telegram ──────────────────────────────────────────────────────────────────
def telegram(msg: str):
    try:
        subprocess.run(
            ["openclaw", "message", "send", "--channel", "telegram",
             "-t", TELEGRAM_USER_ID, "-m", msg],
            capture_output=True, timeout=15
        )
    except Exception:
        pass

# ── LLM ──────────────────────────────────────────────────────────────────────
UA = "Mozilla/5.0"

def call_api(url, headers, payload, max_retries=None):
    """Appelle l'API avec backoff sur 429 (plafonné à 5 min).
    max_retries=None → réessaie indéfiniment (modèles payants).
    max_retries=N    → abandonne après N tentatives (modèles gratuits/Groq)."""
    data    = json.dumps(payload).encode()
    req     = urllib.request.Request(url, data=data,
                                      headers={"User-Agent": UA, **headers}, method="POST")
    attempt = 0
    while True:
        try:
            with urllib.request.urlopen(req, timeout=90) as r:
                return json.loads(r.read())["choices"][0]["message"]["content"].strip()
        except urllib.error.HTTPError as e:
            if e.code == 429:
                if max_retries is not None and attempt >= max_retries:
                    print(f"  429 — quota épuisé ({max_retries} tentatives), passage au suivant", flush=True)
                    return None
                wait = min(30 * (attempt + 1), 300)
                print(f"  429 — attente {wait}s...", flush=True)
                time.sleep(wait)
                attempt += 1
            elif e.code in (401, 403, 404):
                print(f"  Erreur fatale ({e.code}) — abandon de cette API", flush=True)
                return None
            else:
                print(f"  API error {e.code} — abandon", file=sys.stderr)
                return None
        except Exception as e:
            print(f"  Error: {e}", file=sys.stderr)
            return None

# Modèles OpenRouter en cascade (gratuits d'abord, puis payant en dernier recours)
OPENROUTER_MODELS = [
    "mistralai/mistral-small-3.2-24b-instruct",  # payant — prioritaire
    "meta-llama/llama-3.3-70b-instruct:free",
    "google/gemma-3-27b-it:free",
]

def llm(prompt, system="", max_tokens=2000):
    """Cascade : Groq → OpenRouter (5 modèles gratuits en fallback).
    Si tout échoue, pause 3 min et réessaie une dernière fois."""
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    free_models  = [m for m in OPENROUTER_MODELS if m.endswith(":free")]
    paid_models  = [m for m in OPENROUTER_MODELS if not m.endswith(":free")]
    or_keys      = [k for k in [OPENROUTER_KEY, OPENROUTER_KEY2] if k]

    for global_attempt in range(2):
        # 1. OpenRouter clé1 — Mistral Small payant en priorité (réessaie indéfiniment)
        if OPENROUTER_KEY and paid_models:
            for model in paid_models:
                print(f"  Essai OpenRouter clé1 payant : {model.split('/')[-1]}...", flush=True)
                r = call_api(
                    "https://openrouter.ai/api/v1/chat/completions",
                    {"Authorization": f"Bearer {OPENROUTER_KEY}",
                     "Content-Type": "application/json",
                     "HTTP-Referer": "https://apprendia.vercel.app",
                     "X-Title": "Apprendia"},
                    {"model": model, "messages": messages,
                     "max_tokens": max_tokens, "temperature": 0.65},
                    max_retries=None,  # réessaie indéfiniment
                )
                if r: return r

        # 2. Groq (3 tentatives max — fallback gratuit)
        if GROQ_KEY:
            r = call_api(
                "https://api.groq.com/openai/v1/chat/completions",
                {"Authorization": f"Bearer {GROQ_KEY}", "Content-Type": "application/json"},
                {"model": "llama-3.3-70b-versatile", "messages": messages,
                 "max_tokens": max_tokens, "temperature": 0.65},
                max_retries=3,
            )
            if r: return r

        # 3. OpenRouter — 2 clés × modèles gratuits (3 tentatives chacun)
        for key_idx, key in enumerate(or_keys):
            for model in free_models:
                print(f"  Essai OpenRouter clé{key_idx+1} : {model.split('/')[-1]}...", flush=True)
                r = call_api(
                    "https://openrouter.ai/api/v1/chat/completions",
                    {"Authorization": f"Bearer {key}",
                     "Content-Type": "application/json",
                     "HTTP-Referer": "https://apprendia.vercel.app",
                     "X-Title": "Apprendia"},
                    {"model": model, "messages": messages,
                     "max_tokens": max_tokens, "temperature": 0.65},
                    max_retries=3,
                )
                if r: return r

        if global_attempt == 0:
            print("  Tous les modèles épuisés — pause 3 min avant nouvelle tentative...", flush=True)
            time.sleep(180)

    return None

SYSTEM_EDUCATOR = """Tu es un expert pédagogue spécialisé en intelligence artificielle.
Tu crées des formations de haute qualité en français pour une plateforme e-learning.
Tes explications sont précises, illustrées d'exemples concrets et progressives.
Le contenu doit être exact, vérifiable et directement applicable.
Tu n'utilises jamais de markdown superflu. Tes paragraphes sont denses et actionnables."""

# ── Lecture de lib/courses.ts ─────────────────────────────────────────────────
def read_courses():
    text = COURSES_FILE.read_text(encoding="utf-8")
    block = re.search(r'export const COURSES[^=]*=\s*\[(.*?)\];', text, re.DOTALL)
    if not block:
        return []
    courses = []
    for m in re.finditer(r'\{([^}]+)\}', block.group(1)):
        obj = {}
        for field in re.finditer(r'(\w+)\s*:\s*("(?:[^"\\]|\\.)*"|-?\d+|true|false)', m.group(1)):
            k, v = field.group(1), field.group(2)
            try:
                obj[k] = json.loads(v)
            except json.JSONDecodeError:
                obj[k] = v.strip('"')
        if obj.get("id"):
            courses.append(obj)
    return courses

def next_id(courses):
    return max((c.get("id", 0) for c in courses), default=0) + 1

def append_course_metadata(course):
    text = COURSES_FILE.read_text(encoding="utf-8")
    free_str = "true" if course.get("free", False) else "false"
    entry = (f"  {{\n"
             f"    id: {course['id']},\n"
             f"    title: \"{course['title']}\",\n"
             f"    desc: \"{course['desc']}\",\n"
             f"    level: \"{course['level']}\",\n"
             f"    duration: \"{course['duration']}\",\n"
             f"    modules: {course['modules']},\n"
             f"    free: {free_str},\n"
             f"    emoji: \"{course['emoji']}\",\n"
             f"  }},")
    new_text = re.sub(r'(\];)', f"{entry}\n\\1", text, count=1)
    COURSES_FILE.write_text(new_text, encoding="utf-8")

# ── Pipeline de génération de contenu (itératif) ──────────────────────────────
def generate_outline(course: dict) -> list[dict]:
    """Génère un plan structuré avec 5-6 sections."""
    prompt = f"""Crée un plan pédagogique détaillé pour cette formation :

Titre : {course['title']}
Description : {course.get('desc', '')}
Niveau : {course['level']}
Durée : {course.get('duration', '?')}
Modules prévus : {course.get('modules', 6)}

Génère {course.get('modules', 6)} sections progressives qui couvrent le sujet de A à Z.

Format JSON :
[
  {{
    "title": "Titre de la section",
    "key_points": ["point clé 1", "point clé 2", "point clé 3"]
  }}
]
Réponds UNIQUEMENT avec le tableau JSON."""

    result = llm(prompt, SYSTEM_EDUCATOR, max_tokens=1200)
    if not result:
        return []
    try:
        m = re.search(r'\[.*\]', result, re.DOTALL)
        return json.loads(m.group(0)) if m else []
    except json.JSONDecodeError:
        return []

def generate_section(course_title: str, section: dict, idx: int,
                     previous_summaries: list[str]) -> str:
    """Génère le contenu d'une section avec contexte des sections précédentes.
    Approche itérative : chaque section reçoit un résumé des précédentes pour
    assurer la cohérence et éviter les répétitions."""
    context = ""
    if previous_summaries:
        context = "Sections déjà couvertes dans ce cours :\n" + \
                  "\n".join(f"  - {s}" for s in previous_summaries[-4:]) + "\n\n"

    prompt = f"""{context}Formation : "{course_title}"
Section {idx + 1} : {section['title']}
Points clés à couvrir : {', '.join(section.get('key_points', []))}

Rédige le contenu complet de cette section (450 à 600 mots).
Structure attendue :
- Introduction qui contextualise le sujet et donne envie de lire
- Explications précises avec exemples concrets ou cas d'usage réels
- Bloc "À retenir" en fin de section (liste de 3 points essentiels, préfixés par "À retenir:")

Important : le contenu doit être exact et vérifiable. Pas de formulations vagues.
Format : texte brut, paragraphes séparés par des lignes vides. Commence directement."""

    return llm(prompt, SYSTEM_EDUCATOR, max_tokens=1400) or ""

def parse_key_points(content: str) -> tuple[str, list[str]]:
    """Extrait le bloc 'À retenir' du contenu et retourne (texte_propre, points)."""
    key_points = []
    lines = content.split('\n')
    clean_lines = []
    in_retenir = False
    for line in lines:
        stripped = line.strip()
        if re.search(r'à retenir', stripped, re.IGNORECASE):
            in_retenir = True
            continue
        if in_retenir and stripped.startswith('-'):
            key_points.append(stripped.lstrip('- ').strip())
        elif in_retenir and stripped and not stripped.startswith('-'):
            in_retenir = False
            clean_lines.append(line)
        elif not in_retenir:
            clean_lines.append(line)
    return '\n'.join(clean_lines).strip(), key_points

def generate_quiz(course_title: str, summaries: list[str]) -> list[dict]:
    """Génère 3 questions QCM de validation."""
    prompt = f"""Formation : "{course_title}"
Contenus couverts : {' | '.join(summaries)}

Génère 3 questions QCM pour valider la compréhension. Questions précises, ancrées dans le contenu.

Format JSON :
[
  {{
    "question": "Question claire et précise ?",
    "choices": ["A. Choix 1", "B. Choix 2", "C. Choix 3", "D. Choix 4"],
    "answer": "A",
    "explanation": "Explication courte de la bonne réponse"
  }}
]
Réponds UNIQUEMENT avec le JSON."""

    result = llm(prompt, SYSTEM_EDUCATOR, max_tokens=800)
    if not result:
        return []
    try:
        m = re.search(r'\[.*\]', result, re.DOTALL)
        return json.loads(m.group(0)) if m else []
    except json.JSONDecodeError:
        return []

def generate_course_content(course: dict) -> pathlib.Path | None:
    """Pipeline complet : outline → sections itératives → quiz → sauvegarde."""
    CONTENT_DIR.mkdir(parents=True, exist_ok=True)
    cid = course['id']
    out = CONTENT_DIR / f"{cid}.json"

    print(f"  [{cid}] {course['title']} — génération en cours...", flush=True)

    # 1. Plan
    outline = generate_outline(course)
    if not outline:
        print(f"  [{cid}] Échec : plan invalide", file=sys.stderr)
        return None
    print(f"  [{cid}] Plan : {len(outline)} sections", flush=True)

    # 2. Sections (itératif — chaque section reçoit le contexte des précédentes)
    summaries = []
    sections  = []
    for i, sec in enumerate(outline):
        print(f"  [{cid}] Section {i+1}/{len(outline)} : {sec['title'][:45]}...", flush=True)
        raw_content = generate_section(course['title'], sec, i, summaries)

        if not raw_content or len(raw_content.split()) < 80:
            raw_content = f"Contenu de la section '{sec['title']}' — à compléter."

        content, extracted_kp = parse_key_points(raw_content)
        key_points = extracted_kp if extracted_kp else sec.get('key_points', [])

        sections.append({
            "title":      sec['title'],
            "content":    content,
            "key_points": key_points,
        })
        summaries.append(f"{sec['title']}: {', '.join(key_points)}")
        time.sleep(4)  # éviter le rate-limit entre sections

    # 3. Quiz
    print(f"  [{cid}] Génération du quiz...", flush=True)
    quiz = generate_quiz(course['title'], summaries)

    # 4. Sauvegarde
    data = {
        "id":           cid,
        "sections":     sections,
        "quiz":         quiz,
        "word_count":   sum(len(s['content'].split()) for s in sections),
        "generated_at": datetime.datetime.now().isoformat(),
    }
    out.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"  [{cid}] Sauvegardé → {out.name} ({data['word_count']} mots)", flush=True)
    return out

# ── Proposition de nouvelles formations ───────────────────────────────────────
def propose_courses(audit_text: str, n: int = 2) -> list[dict]:
    prompt = f"""{audit_text}

Règles :
- Niveaux : "Débutant", "Intermédiaire", "Avancé"
- free: true UNIQUEMENT pour Débutant
- Durées : Débutant 3-5h, Intermédiaire 6-10h, Avancé 10-20h
- Modules : Débutant 6-8, Intermédiaire 10-14, Avancé 14-24

Propose {n} nouvelles formations complémentaires au catalogue. Sujets IA populaires en 2026.

Réponds UNIQUEMENT avec un tableau JSON :
[
  {{
    "title": "Titre court et accrocheur",
    "desc": "Une phrase (max 80 caractères)",
    "level": "Débutant|Intermédiaire|Avancé",
    "duration": "Xh",
    "modules": 10,
    "free": false,
    "emoji": "🤖"
  }}
]"""
    result = llm(prompt)
    if not result:
        return []
    try:
        m = re.search(r'\[.*\]', result, re.DOTALL)
        return json.loads(m.group(0)) if m else []
    except json.JSONDecodeError:
        return []

# ── Git commit + push ─────────────────────────────────────────────────────────
def git_push(files: list[pathlib.Path], message: str) -> bool:
    try:
        paths = [str(f.relative_to(BASE_DIR)) for f in files]
        subprocess.run(["git", "-C", str(BASE_DIR), "add"] + paths,
                       check=True, capture_output=True)
        subprocess.run(["git", "-C", str(BASE_DIR), "commit", "-m", message],
                       check=True, capture_output=True)
        subprocess.run(["git", "-C", str(BASE_DIR), "push", "origin", "main"],
                       check=True, capture_output=True)
        return True
    except subprocess.CalledProcessError as e:
        print(f"  Git error: {e}", file=sys.stderr)
        return False

# ── Réparation des sections vides ────────────────────────────────────────────
MIN_SECTION_WORDS = 80

def find_broken_sections(course_id: int) -> list[int]:
    """Retourne les indices des sections avec moins de MIN_SECTION_WORDS mots."""
    f = CONTENT_DIR / f"{course_id}.json"
    if not f.exists():
        return []
    data = json.loads(f.read_text(encoding="utf-8"))
    return [i for i, s in enumerate(data["sections"])
            if len(s.get("content", "").split()) < MIN_SECTION_WORDS]

def repair_course(course: dict) -> bool:
    """Régénère les sections vides/trop courtes et le quiz manquant d'une formation.
    Retourne True si au moins une réparation a été effectuée."""
    cid = course["id"]
    broken = find_broken_sections(cid)

    f = CONTENT_DIR / f"{cid}.json"
    if not f.exists():
        return False
    data = json.loads(f.read_text(encoding="utf-8"))

    # Répare le quiz manquant ou vide
    quiz_repaired = False
    if not data.get("quiz"):
        print(f"  [{cid}] {course['title']} — quiz manquant, régénération...", flush=True)
        summaries = [
            f"{s['title']}: {', '.join(s.get('key_points', []))}"
            for s in data["sections"]
            if len(s.get("content", "").split()) >= MIN_SECTION_WORDS
        ]
        quiz = generate_quiz(course["title"], summaries)
        if quiz:
            data["quiz"] = quiz
            data["repaired_at"] = datetime.datetime.now().isoformat()
            f.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
            print(f"  [{cid}] Quiz régénéré ({len(quiz)} questions)", flush=True)
            quiz_repaired = True
        else:
            print(f"  [{cid}] Échec régénération quiz", file=sys.stderr)

    if not broken:
        return quiz_repaired

    f = CONTENT_DIR / f"{cid}.json"
    data = json.loads(f.read_text(encoding="utf-8"))
    sections = data["sections"]
    repaired = 0

    print(f"  [{cid}] {course['title']} — {len(broken)} section(s) à réparer : {broken}", flush=True)

    for i in broken:
        sec = sections[i]
        # Contexte : résumés des sections précédentes correctes
        previous_summaries = [
            f"{sections[j]['title']}: {', '.join(sections[j].get('key_points', []))}"
            for j in range(i) if j not in broken
        ]
        print(f"  [{cid}] Réparation section {i+1} : {sec['title'][:45]}...", flush=True)
        raw = generate_section(
            course["title"],
            {"title": sec["title"], "key_points": sec.get("key_points", [])},
            i, previous_summaries
        )
        if raw and len(raw.split()) >= MIN_SECTION_WORDS:
            content, kp = parse_key_points(raw)
            sections[i]["content"]    = content
            sections[i]["key_points"] = kp if kp else sec.get("key_points", [])
            repaired += 1
            print(f"  [{cid}] Section {i+1} réparée ({len(content.split())} mots)", flush=True)
        else:
            print(f"  [{cid}] Section {i+1} toujours vide après tentative", file=sys.stderr)
        time.sleep(4)

    if repaired:
        data["word_count"]   = sum(len(s["content"].split()) for s in sections)
        data["repaired_at"]  = datetime.datetime.now().isoformat()
        f.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"  [{cid}] {repaired} section(s) réparée(s) — {data['word_count']} mots total", flush=True)

    return repaired > 0

def repair_all() -> list[pathlib.Path]:
    """Vérifie toutes les formations existantes et répare les sections vides."""
    courses  = read_courses()
    repaired = []
    for c in courses:
        if repair_course(c):
            repaired.append(CONTENT_DIR / f"{c['id']}.json")
        time.sleep(5)
    return repaired

# ── Audit ─────────────────────────────────────────────────────────────────────
def audit_text() -> str:
    courses = read_courses()
    lines = [f"Catalogue actuel ({len(courses)} formations) :"]
    for c in courses:
        has_content = (CONTENT_DIR / f"{c.get('id')}.json").exists()
        label = "gratuit" if c.get("free") else "premium"
        content_flag = "✅" if has_content else "⬜"
        lines.append(f"  {content_flag} [{c.get('level','?'):14}] {c.get('title','?')} ({label})")
    lines.append(f"\n✅ = contenu généré | ⬜ = pas encore de contenu")
    return "\n".join(lines)

# ── Commandes ─────────────────────────────────────────────────────────────────
def cmd_full():
    """Cycle nuit : propose 2 nouvelles formations + génère leur contenu."""
    print("Apprendia — Content Manager (cycle nuit)", flush=True)
    LOGS_DIR.mkdir(exist_ok=True)

    txt = audit_text()
    print(txt, flush=True)

    # 1. Proposer de nouvelles formations
    print("\nProposition de nouvelles formations...", flush=True)
    proposals = propose_courses(txt, n=2)
    existing  = {c.get("title", "").lower() for c in read_courses()}
    courses   = read_courses()
    new_meta  = []

    for p in proposals:
        if p.get("title", "").lower() in existing:
            continue
        p["id"]   = next_id(courses)
        p["free"] = (p.get("level") == "Débutant")
        append_course_metadata(p)
        courses.append(p)
        new_meta.append(p)
        print(f"  + Ajouté : {p['title']} [{p['level']}]", flush=True)
        time.sleep(3)

    # 2. Réparer les sections vides dans les formations déjà générées
    print("\nVérification des sections vides...", flush=True)
    repaired_files = repair_all()

    # 3. Générer le contenu pour toutes les formations sans contenu
    all_courses   = read_courses()
    missing       = [c for c in all_courses if not (CONTENT_DIR / f"{c['id']}.json").exists()]
    new_content   = []

    print(f"\nGénération du contenu ({len(missing)} formations sans contenu)...", flush=True)
    for c in missing:
        path = generate_course_content(c)
        if path:
            new_content.append(path)
        time.sleep(10)

    if not new_meta and not new_content and not repaired_files:
        print("Rien à faire.", flush=True)
        return

    # 4. Commit + push
    files_to_commit = list({COURSES_FILE, *repaired_files, *new_content})
    titles = ([c["title"] for c in new_meta]
              + [f"repair {p.stem}" for p in repaired_files]
              + [p.stem for p in new_content])
    msg = f"content: nightly update [{datetime.date.today()}]\n\n" + \
          "\n".join(f"- {t}" for t in titles)
    pushed = git_push(files_to_commit, msg)

    # 5. Log + Telegram
    log_file = LOGS_DIR / f"content_manager_{datetime.date.today().strftime('%Y%m%d')}.log"
    with open(log_file, "a") as f:
        f.write(f"[{datetime.datetime.now().isoformat()}] new_meta={[c['title'] for c in new_meta]} new_content={[p.name for p in new_content]} repaired={[p.name for p in repaired_files]}\n")

    telegram(
        f"🎓 *Apprendia — {datetime.date.today().strftime('%d/%m/%Y')}*\n\n" +
        (f"📋 {len(new_meta)} nouvelle(s) formation(s) ajoutée(s)\n" if new_meta else "") +
        (f"✍️ {len(new_content)} contenu(s) généré(s)\n" if new_content else "") +
        (f"🔧 {len(repaired_files)} formation(s) réparée(s)\n" if repaired_files else "") +
        f"📊 Catalogue : {len(all_courses)} formations\n" +
        f"{'✅ Déployé sur Vercel' if pushed else '⚠ Push échoué'}"
    )

def cmd_generate(course_id: int):
    """Génère (ou régénère) le contenu d'une formation spécifique."""
    courses = read_courses()
    course  = next((c for c in courses if c.get("id") == course_id), None)
    if not course:
        print(f"Formation {course_id} introuvable dans lib/courses.ts", file=sys.stderr)
        sys.exit(1)

    CONTENT_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Génération du contenu pour : {course['title']}", flush=True)
    path = generate_course_content(course)
    if not path:
        print("Échec de la génération", file=sys.stderr)
        sys.exit(1)

    pushed = git_push([path],
                      f"content: generate course {course_id} — {course['title']}")
    print(f"\n{'✅ Publié sur Vercel' if pushed else '⚠ Contenu généré mais push échoué'}")
    telegram(
        f"✍️ *Contenu généré* : {course['title']}\n"
        f"{'✅ Publié' if pushed else '⚠ Push échoué'} — "
        f"https://apprendia.vercel.app/formations/{course_id}"
    )

def cmd_generate_all():
    """Génère le contenu pour toutes les formations qui n'en ont pas encore."""
    courses = read_courses()
    missing = [c for c in courses if not (CONTENT_DIR / f"{c['id']}.json").exists()]
    print(f"{len(missing)} formation(s) sans contenu", flush=True)
    new_files = []
    for c in missing:
        path = generate_course_content(c)
        if path:
            new_files.append(path)
        time.sleep(10)
    if new_files:
        pushed = git_push(new_files,
                          f"content: generate {len(new_files)} course(s) [{datetime.date.today()}]")
        print(f"\n{len(new_files)} contenu(s) générés — {'push OK' if pushed else 'push échoué'}")
    else:
        print("Aucun contenu généré")

def cmd_repair():
    """Répare les sections vides dans toutes les formations existantes."""
    repaired = repair_all()
    if repaired:
        pushed = git_push(repaired,
                          f"content: repair broken sections [{datetime.date.today()}]")
        print(f"\n{len(repaired)} formation(s) réparée(s) — {'push OK' if pushed else 'push échoué'}")
        telegram(
            f"🔧 *Apprendia — réparation*\n"
            f"{len(repaired)} formation(s) réparée(s)\n"
            f"{'✅ Déployé' if pushed else '⚠ Push échoué'}"
        )
    else:
        print("Aucune section vide détectée.")

def cmd_audit():
    print(audit_text())

def cmd_status():
    courses  = read_courses()
    with_c   = sum(1 for c in courses if (CONTENT_DIR / f"{c['id']}.json").exists())
    free_c   = sum(1 for c in courses if c.get("free"))
    print(f"Catalogue : {len(courses)} formations ({free_c} gratuites, {len(courses)-free_c} premium)")
    print(f"Contenu   : {with_c}/{len(courses)} formations ont leur contenu généré")

if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "full"
    if cmd == "repair":
        cmd_repair()
    elif cmd == "generate" and len(sys.argv) > 2:
        cmd_generate(int(sys.argv[2]))
    elif cmd == "generate-all":
        cmd_generate_all()
    elif cmd == "audit":
        cmd_audit()
    elif cmd == "status":
        cmd_status()
    else:
        cmd_full()
