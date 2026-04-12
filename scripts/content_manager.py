#!/usr/bin/env python3
"""
content_manager.py — Agent autonome de contenu pour AI Academy Hub
Tourne chaque nuit, audite le site, génère de nouveaux modules/articles.

Pipeline :
  1. Audit  — lit l'état actuel du site (pages, composants, contenu existant)
  2. Plan   — LLM identifie les gaps et propose du nouveau contenu
  3. Génère — itérative (outline → sections → assemblage), comme write_story
  4. Écrit  — JSON dans app/content/courses/ ou app/content/articles/
  5. Commit — git commit + notification Telegram

Usage :
  python3 content_manager.py            → cycle complet (audit + génération)
  python3 content_manager.py audit      → audit seul, sans génération
  python3 content_manager.py generate   → génère du contenu sans re-auditer
  python3 content_manager.py status     → état du contenu actuel
"""
import sys, os, re, json, datetime, pathlib, subprocess, textwrap, urllib.request, time

BASE_DIR     = pathlib.Path(__file__).resolve().parent.parent
CONTENT_DIR  = BASE_DIR / "app" / "content"
COURSES_DIR  = CONTENT_DIR / "courses"
ARTICLES_DIR = CONTENT_DIR / "articles"
INDEX_FILE   = CONTENT_DIR / "index.json"
LOGS_DIR     = BASE_DIR / "logs"
APP_DIR      = BASE_DIR / "app"

TELEGRAM_USER_ID = "8174597010"

# Catégories thématiques de la plateforme
ACADEMY_CATEGORIES = [
    "fondamentaux-ia",
    "llm-et-prompting",
    "agents-autonomes",
    "vision-par-ordinateur",
    "mlops-et-deploiement",
    "ethique-et-ia-responsable",
    "outils-pratiques",
]

DIFFICULTY_LEVELS = ["débutant", "intermédiaire", "avancé"]

# ── Chargement .env ───────────────────────────────────────────────────────────
def load_env():
    for env_path in [BASE_DIR / ".env", pathlib.Path("/root/youtube-pipeline/.env")]:
        if env_path.exists():
            for line in env_path.read_text().splitlines():
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    k, _, v = line.partition('=')
                    os.environ.setdefault(k.strip(), v.strip())

load_env()
GROQ_KEY       = os.getenv("GROQ_API_KEY", "")
OPENROUTER_KEY = os.getenv("OPENROUTER_API_KEY", "")
UA = "Mozilla/5.0 (X11; Linux x86_64)"

# ── Telegram ──────────────────────────────────────────────────────────────────
def telegram_send(message: str):
    try:
        subprocess.run(
            ["openclaw", "message", "send", "--to", TELEGRAM_USER_ID, "--message", message],
            capture_output=True, timeout=15
        )
    except Exception as e:
        print(f"  ⚠ Telegram: {e}", file=sys.stderr)

# ── LLM ──────────────────────────────────────────────────────────────────────
def call_api(url, headers, payload, timeout=90, retries=5):
    data = json.dumps(payload).encode()
    req  = urllib.request.Request(
        url, data=data,
        headers={"User-Agent": UA, **headers},
        method="POST"
    )
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return json.loads(r.read())["choices"][0]["message"]["content"].strip()
        except urllib.error.HTTPError as e:
            if e.code == 429:
                wait = 30 * (attempt + 1)  # 30s, 60s, 90s
                print(f"  ⏳ 429 rate-limit ({url.split('/')[2]}) — attente {wait}s...", flush=True)
                time.sleep(wait)
                continue
            print(f"  ⚠ API ({url.split('/')[2]}): {e}", file=sys.stderr)
            return None
        except Exception as e:
            print(f"  ⚠ API ({url.split('/')[2]}): {e}", file=sys.stderr)
            return None
    return None

def llm(prompt: str, system: str = "", max_tokens: int = 3000, temp: float = 0.7) -> str | None:
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    if GROQ_KEY:
        r = call_api(
            "https://api.groq.com/openai/v1/chat/completions",
            {"Authorization": f"Bearer {GROQ_KEY}", "Content-Type": "application/json"},
            {"model": "llama-3.3-70b-versatile", "messages": messages,
             "max_tokens": max_tokens, "temperature": temp},
        )
        if r: return r

    if OPENROUTER_KEY:
        r = call_api(
            "https://openrouter.ai/api/v1/chat/completions",
            {"Authorization": f"Bearer {OPENROUTER_KEY}",
             "Content-Type": "application/json",
             "HTTP-Referer": "https://ai-academy-hub.com",
             "X-Title": "AI Academy Hub Content Manager"},
            {"model": "meta-llama/llama-3.3-70b-instruct:free",
             "messages": messages, "max_tokens": max_tokens, "temperature": temp},
        )
        if r: return r

    return None

SYSTEM_EDUCATOR = """Tu es un expert pédagogue spécialisé en intelligence artificielle,
machine learning et outils IA. Tu crées des contenus de formation de haute qualité
en français pour une plateforme e-learning. Tes explications sont claires,
progressives, illustrées d'exemples concrets et adaptées au niveau indiqué.
Tu n'utilises jamais de markdown superflu. Tes sections sont denses et actionnables."""

# ── Audit du site ─────────────────────────────────────────────────────────────
def read_existing_content() -> dict:
    """Lit tout le contenu existant du site."""
    COURSES_DIR.mkdir(parents=True, exist_ok=True)
    ARTICLES_DIR.mkdir(parents=True, exist_ok=True)

    courses  = []
    articles = []

    for f in sorted(COURSES_DIR.glob("*.json")):
        try:
            d = json.loads(f.read_text(encoding="utf-8"))
            courses.append({
                "slug":     d.get("slug", f.stem),
                "title":    d.get("title", "?"),
                "category": d.get("category", "?"),
                "level":    d.get("level", "?"),
                "sections": len(d.get("sections", [])),
            })
        except Exception:
            pass

    for f in sorted(ARTICLES_DIR.glob("*.json")):
        try:
            d = json.loads(f.read_text(encoding="utf-8"))
            articles.append({
                "slug":  d.get("slug", f.stem),
                "title": d.get("title", "?"),
                "topic": d.get("topic", "?"),
            })
        except Exception:
            pass

    # Pages/composants Next.js existants
    pages = [str(p.relative_to(BASE_DIR)) for p in APP_DIR.rglob("*.tsx")]

    return {"courses": courses, "articles": articles, "pages": pages}

def audit_site(content: dict) -> str:
    """Analyse le contenu existant et identifie les lacunes."""
    courses_txt  = "\n".join(
        f"  - [{c['level']}] {c['title']} ({c['category']}, {c['sections']} sections)"
        for c in content["courses"]
    ) or "  (aucun cours)"

    articles_txt = "\n".join(
        f"  - {a['title']} ({a['topic']})"
        for a in content["articles"]
    ) or "  (aucun article)"

    prompt = f"""Tu es l'auditeur de contenu d'une plateforme de formation en IA appelée "AI Academy Hub".

Contenu existant :

Cours ({len(content['courses'])}) :
{courses_txt}

Articles ({len(content['articles'])}) :
{articles_txt}

Catégories de la plateforme : {', '.join(ACADEMY_CATEGORIES)}
Niveaux : {', '.join(DIFFICULTY_LEVELS)}

Identifie :
1. Les catégories et niveaux sous-représentés
2. Les sujets IA incontournables manquants
3. 3 cours prioritaires à créer (avec catégorie, niveau, angle unique)
4. 2 articles courts à créer (actualité IA, tutoriel pratique, ou concept clé)

Format JSON strict :
{{
  "manques": ["gap1", "gap2", "gap3"],
  "cours_proposés": [
    {{"titre": "...", "slug": "...", "catégorie": "...", "niveau": "...", "angle": "...", "premium": false}},
    ...
  ],
  "règle_premium": "Les cours débutants/introduction sont public=false. Les cours intermédiaires et avancés sont premium=true.",
  "articles_proposés": [
    {{"titre": "...", "slug": "...", "sujet": "...", "type": "tutoriel|actualité|concept"}},
    ...
  ]
}}

Réponds UNIQUEMENT avec le JSON."""

    result = llm(prompt, max_tokens=1200, temp=0.6)
    return result

# ── Génération de cours (iteratif) ────────────────────────────────────────────
def generate_course_outline(idea: dict) -> dict | None:
    """Génère un plan de cours structuré (5-7 sections)."""
    prompt = f"""Crée un plan détaillé pour ce cours de formation en IA :

Titre : {idea['titre']}
Catégorie : {idea['catégorie']}
Niveau : {idea['niveau']}
Angle pédagogique : {idea['angle']}

Génère un plan avec 5 à 6 sections progressives.
Chaque section doit couvrir un aspect distinct avec des objectifs d'apprentissage clairs.

Format JSON :
{{
  "title": "Titre final du cours",
  "slug": "{idea['slug']}",
  "category": "{idea['catégorie']}",
  "level": "{idea['niveau']}",
  "duration_min": 45,
  "summary": "Résumé en 2 phrases du cours",
  "objectives": ["objectif1", "objectif2", "objectif3"],
  "sections": [
    {{"title": "...", "key_points": ["point1", "point2", "point3"]}},
    ...
  ]
}}

Réponds UNIQUEMENT avec le JSON."""

    result = llm(prompt, SYSTEM_EDUCATOR, max_tokens=1500, temp=0.65)
    if not result:
        return None
    try:
        m = re.search(r'\{.*\}', result, re.DOTALL)
        return json.loads(m.group(0)) if m else None
    except json.JSONDecodeError:
        return None

def generate_section_content(course_title: str, section: dict,
                              section_idx: int, previous_summaries: list[str]) -> str:
    """Génère le contenu d'une section de cours avec contexte des sections précédentes."""
    context = ""
    if previous_summaries:
        context = "Sections précédentes déjà couvertes :\n" + \
                  "\n".join(f"  - {s}" for s in previous_summaries[-3:]) + "\n\n"

    prompt = f"""{context}Cours : "{course_title}"
Section {section_idx + 1} : {section['title']}
Points clés à couvrir : {', '.join(section.get('key_points', []))}

Rédige le contenu complet de cette section (400 à 600 mots).
Inclure :
- Une introduction qui accroche et annonce le contenu
- Des explications claires avec exemples concrets ou analogies
- Un encadré "À retenir" à la fin (2-3 points essentiels)

Format : texte brut, paragraphes séparés par des sauts de ligne.
Commence directement par le contenu, sans titres markdown."""

    return llm(prompt, SYSTEM_EDUCATOR, max_tokens=1200, temp=0.75) or ""

def build_course(idea: dict) -> pathlib.Path | None:
    """Pipeline complet : outline → sections → sauvegarde JSON."""
    print(f"  📘 Cours : {idea['titre']}...", flush=True)

    # 1. Plan
    outline = generate_course_outline(idea)
    if not outline or not outline.get("sections"):
        print("    ✗ Plan invalide", file=sys.stderr)
        return None
    print(f"    Plan : {len(outline['sections'])} sections", flush=True)

    # 2. Génération itérative des sections
    summaries = []
    filled_sections = []
    for i, sec in enumerate(outline["sections"]):
        print(f"    Section {i+1}/{len(outline['sections'])} : {sec['title'][:40]}...", flush=True)
        content = generate_section_content(outline["title"], sec, i, summaries)
        if not content:
            content = f"Contenu de la section '{sec['title']}' — à compléter."

        filled_sections.append({
            "title":      sec["title"],
            "key_points": sec.get("key_points", []),
            "content":    content,
        })
        # Résumé compact pour le contexte des sections suivantes
        summaries.append(f"{sec['title']} : {' '.join(sec.get('key_points', []))}")
        time.sleep(4)  # éviter le rate-limit entre sections

    # 3. Quiz de fin de cours (3 questions)
    quiz = generate_quiz(outline["title"], summaries)

    # 4. Assemblage
    course_data = {
        **outline,
        "sections":   filled_sections,
        "quiz":       quiz,
        "premium":    idea.get("premium", False),
        "created_at": datetime.datetime.now().isoformat(),
        "word_count": sum(len(s["content"].split()) for s in filled_sections),
    }

    # 5. Sauvegarde
    slug = re.sub(r'[^a-z0-9-]', '', outline.get("slug", idea["slug"]).lower().replace(" ", "-"))
    out_path = COURSES_DIR / f"{slug}.json"
    out_path.write_text(json.dumps(course_data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"    ✅ {out_path.name} ({course_data['word_count']} mots)", flush=True)
    return out_path

def generate_quiz(course_title: str, section_summaries: list[str]) -> list[dict]:
    """Génère 3 questions QCM pour valider l'apprentissage."""
    summaries_txt = "\n".join(f"- {s}" for s in section_summaries)
    prompt = f"""Cours : "{course_title}"
Contenus couverts :
{summaries_txt}

Génère 3 questions QCM pour valider la compréhension. Chaque question : 4 choix, une seule bonne réponse.

Format JSON :
[
  {{
    "question": "...",
    "choices": ["A. ...", "B. ...", "C. ...", "D. ..."],
    "answer": "A",
    "explanation": "Explication courte de la bonne réponse"
  }},
  ...
]
Réponds UNIQUEMENT avec le JSON."""

    result = llm(prompt, SYSTEM_EDUCATOR, max_tokens=800, temp=0.5)
    if not result:
        return []
    try:
        m = re.search(r'\[.*\]', result, re.DOTALL)
        return json.loads(m.group(0)) if m else []
    except json.JSONDecodeError:
        return []

# ── Génération d'articles ─────────────────────────────────────────────────────
def build_article(idea: dict) -> pathlib.Path | None:
    """Génère un article court (600-900 mots) sur un sujet IA."""
    print(f"  📄 Article : {idea['titre']}...", flush=True)

    prompt = f"""Rédige un article de formation en IA en français.

Titre : {idea['titre']}
Sujet : {idea['sujet']}
Type : {idea['type']}

Structure obligatoire :
- Introduction accrocheuse (2-3 phrases)
- Corps (4-5 paragraphes denses, exemples concrets, chiffres si pertinents)
- Section "Ressources complémentaires" (3 suggestions de lectures/outils)
- Conclusion avec appel à l'action

Entre 600 et 900 mots. Texte brut, paragraphes séparés par des sauts de ligne."""

    content = llm(prompt, SYSTEM_EDUCATOR, max_tokens=1500, temp=0.75)
    if not content:
        return None

    slug = re.sub(r'[^a-z0-9-]', '-', idea['slug'].lower())
    slug = re.sub(r'-+', '-', slug).strip('-')
    article_data = {
        "slug":       slug,
        "title":      idea["titre"],
        "topic":      idea["sujet"],
        "type":       idea["type"],
        "content":    content,
        "word_count": len(content.split()),
        "created_at": datetime.datetime.now().isoformat(),
    }

    out_path = ARTICLES_DIR / f"{slug}.json"
    out_path.write_text(json.dumps(article_data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"    ✅ {out_path.name} ({article_data['word_count']} mots)", flush=True)
    return out_path

# ── Index global ──────────────────────────────────────────────────────────────
def rebuild_index():
    """Reconstruit app/content/index.json à partir des fichiers existants."""
    courses  = []
    articles = []

    for f in sorted(COURSES_DIR.glob("*.json")):
        try:
            d = json.loads(f.read_text(encoding="utf-8"))
            courses.append({
                "slug":       d.get("slug", f.stem),
                "title":      d.get("title", ""),
                "category":   d.get("category", ""),
                "level":      d.get("level", ""),
                "summary":    d.get("summary", ""),
                "duration":   d.get("duration_min", 0),
                "sections":   len(d.get("sections", [])),
                "created_at": d.get("created_at", ""),
            })
        except Exception:
            pass

    for f in sorted(ARTICLES_DIR.glob("*.json")):
        try:
            d = json.loads(f.read_text(encoding="utf-8"))
            articles.append({
                "slug":       d.get("slug", f.stem),
                "title":      d.get("title", ""),
                "topic":      d.get("topic", ""),
                "type":       d.get("type", ""),
                "word_count": d.get("word_count", 0),
                "created_at": d.get("created_at", ""),
            })
        except Exception:
            pass

    index = {
        "updated_at": datetime.datetime.now().isoformat(),
        "stats": {
            "courses":  len(courses),
            "articles": len(articles),
            "total_content": len(courses) + len(articles),
        },
        "courses":  courses,
        "articles": articles,
    }

    INDEX_FILE.write_text(json.dumps(index, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"  Index → {len(courses)} cours, {len(articles)} articles", flush=True)

# ── Git commit ────────────────────────────────────────────────────────────────
def git_commit(new_files: list[pathlib.Path]) -> bool:
    """Commit le nouveau contenu dans le repo."""
    try:
        for f in new_files + [INDEX_FILE]:
            if f.exists():
                subprocess.run(["git", "add", str(f)], cwd=BASE_DIR, check=True, capture_output=True)

        msg = f"content: add {len(new_files)} new item(s) [{datetime.date.today()}]"
        result = subprocess.run(
            ["git", "commit", "-m", msg],
            cwd=BASE_DIR, capture_output=True, text=True
        )
        if result.returncode == 0:
            print(f"  ✅ Git commit : {msg}", flush=True)
            return True
        else:
            print(f"  ⚠ Git commit : {result.stderr.strip()}", file=sys.stderr)
            return False
    except Exception as e:
        print(f"  ⚠ Git error : {e}", file=sys.stderr)
        return False

# ── Commandes ─────────────────────────────────────────────────────────────────
def cmd_full():
    """Cycle complet : audit → plan → génération → commit → notification."""
    print("🎓 AI Academy Hub — Content Manager", flush=True)
    date_str = datetime.datetime.now().strftime("%d/%m/%Y")
    LOGS_DIR.mkdir(parents=True, exist_ok=True)
    log_file = LOGS_DIR / f"content_manager_{datetime.datetime.now().strftime('%Y%m%d')}.log"

    # ── Audit ─────────────────────────────────────────────────────────────────
    print("🔍 Audit du contenu existant...", flush=True)
    content = read_existing_content()
    print(f"  {len(content['courses'])} cours, {len(content['articles'])} articles", flush=True)

    # ── Plan via LLM ──────────────────────────────────────────────────────────
    print("💡 Analyse des lacunes et planification...", flush=True)
    plan_raw = audit_site(content)
    if not plan_raw:
        print("✗ Impossible de générer le plan", file=sys.stderr)
        telegram_send("⚠️ AI Academy Hub : content_manager a échoué à générer le plan (API down ?)")
        return

    try:
        m = re.search(r'\{.*\}', plan_raw, re.DOTALL)
        plan = json.loads(m.group(0)) if m else {}
    except json.JSONDecodeError:
        plan = {}

    cours_proposes   = plan.get("cours_proposés", [])[:2]   # max 2 cours/nuit
    articles_proposes = plan.get("articles_proposés", [])[:1] # max 1 article/nuit
    manques          = plan.get("manques", [])

    print(f"  Plan : {len(cours_proposes)} cours + {len(articles_proposes)} article(s)", flush=True)

    # ── Génération ────────────────────────────────────────────────────────────
    new_files: list[pathlib.Path] = []

    for idea in cours_proposes:
        path = build_course(idea)
        if path:
            new_files.append(path)

    for idea in articles_proposes:
        path = build_article(idea)
        if path:
            new_files.append(path)

    if not new_files:
        print("✗ Aucun contenu généré", file=sys.stderr)
        return

    # ── Index + Commit ────────────────────────────────────────────────────────
    rebuild_index()
    committed = git_commit(new_files)

    # ── Log ───────────────────────────────────────────────────────────────────
    with open(log_file, "a") as f:
        f.write(f"[{datetime.datetime.now().isoformat()}] generated: {len(new_files)} files\n")
        for p in new_files:
            f.write(f"  + {p.name}\n")

    # ── Telegram ──────────────────────────────────────────────────────────────
    total = read_existing_content()
    lines = [f"🎓 *AI Academy Hub — {date_str}*\n"]

    if manques:
        lines.append("🔎 *Lacunes identifiées :*")
        for m in manques[:3]:
            lines.append(f"  • {m}")
        lines.append("")

    lines.append(f"✨ *{len(new_files)} nouveau(x) contenu(s) ajouté(s) :*")
    for p in new_files:
        try:
            d = json.loads(p.read_text(encoding="utf-8"))
            emoji = "📘" if p.parent.name == "courses" else "📄"
            lines.append(f"  {emoji} *{d.get('title', p.stem)}*")
            if p.parent.name == "courses":
                lines.append(f"    _{d.get('summary', ''[:100])}_")
                lines.append(f"    {len(d.get('sections', []))} sections · {d.get('level', '')} · {d.get('duration_min', 0)} min")
        except Exception:
            lines.append(f"  • {p.name}")

    lines.append(f"\n📊 Total : *{total['courses']} cours*, *{total['articles']} articles*")
    if committed:
        lines.append("✅ Commit git effectué")

    telegram_send("\n".join(lines))
    print(f"✅ {len(new_files)} contenus générés et committé(s)", flush=True)

def cmd_audit():
    content = read_existing_content()
    print(f"📊 Contenu existant :")
    print(f"  Cours    : {len(content['courses'])}")
    for c in content["courses"]:
        print(f"    [{c['level']}] {c['title']} — {c['category']} ({c['sections']} sections)")
    print(f"  Articles : {len(content['articles'])}")
    for a in content["articles"]:
        print(f"    {a['title']} ({a['topic']})")
    print(f"  Pages    : {len(content['pages'])}")
    for p in content["pages"]:
        print(f"    {p}")

def cmd_status():
    if INDEX_FILE.exists():
        idx = json.loads(INDEX_FILE.read_text(encoding="utf-8"))
        print(f"📊 Index : {idx['stats']}")
        print(f"   Mis à jour : {idx['updated_at']}")
    else:
        content = read_existing_content()
        print(f"📊 {len(content['courses'])} cours, {len(content['articles'])} articles (pas d'index)")

# ── Main ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "run"

    if cmd in ("run", "generate"):
        cmd_full()
    elif cmd == "audit":
        cmd_audit()
    elif cmd == "status":
        cmd_status()
    else:
        print(__doc__)
        sys.exit(1)
