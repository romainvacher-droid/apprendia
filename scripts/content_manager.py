#!/usr/bin/env python3
"""
content_manager.py — Agent autonome de contenu pour AI Academy Hub
Tourne chaque nuit (cron 1:17). Analyse le catalogue existant et ajoute
de nouvelles formations dans lib/courses.ts, puis commit + push → Vercel déploie.

Source de vérité : lib/courses.ts  (tableau COURSES)
Infrastructure    : Vercel (hébergement) + GitHub (sources) + Neon (BDD)

Usage :
  python3 content_manager.py          → cycle complet (audit + ajout)
  python3 content_manager.py audit    → affiche le catalogue sans modifier
  python3 content_manager.py status   → résumé rapide
"""
import sys, os, re, json, pathlib, subprocess, time, urllib.request, datetime

BASE_DIR     = pathlib.Path(__file__).resolve().parent.parent
COURSES_FILE = BASE_DIR / "lib" / "courses.ts"
LOGS_DIR     = BASE_DIR / "logs"

TELEGRAM_USER_ID = "8174597010"

# ── .env ──────────────────────────────────────────────────────────────────────
def load_env():
    for p in [BASE_DIR / ".env.local", BASE_DIR / ".env",
              pathlib.Path("/root/youtube-pipeline/.env")]:
        if p.exists():
            for line in p.read_text().splitlines():
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    k, _, v = line.partition('=')
                    os.environ.setdefault(k.strip(), v.strip().strip('"'))

load_env()
GROQ_KEY       = os.getenv("GROQ_API_KEY", "")
OPENROUTER_KEY = os.getenv("OPENROUTER_API_KEY", "")

# ── Telegram ──────────────────────────────────────────────────────────────────
def telegram(msg: str):
    try:
        subprocess.run(
            ["openclaw", "message", "send", "--to", TELEGRAM_USER_ID, "--message", msg],
            capture_output=True, timeout=15
        )
    except Exception:
        pass

# ── LLM ──────────────────────────────────────────────────────────────────────
UA = "Mozilla/5.0"

def call_api(url, headers, payload, retries=5):
    data = json.dumps(payload).encode()
    req  = urllib.request.Request(url, data=data,
                                   headers={"User-Agent": UA, **headers}, method="POST")
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=90) as r:
                return json.loads(r.read())["choices"][0]["message"]["content"].strip()
        except urllib.error.HTTPError as e:
            if e.code == 429:
                wait = 30 * (attempt + 1)
                print(f"  429 ({url.split('/')[2]}) — attente {wait}s...", flush=True)
                time.sleep(wait)
            else:
                print(f"  API error: {e}", file=sys.stderr)
                return None
        except Exception as e:
            print(f"  Error: {e}", file=sys.stderr)
            return None
    return None

def llm(prompt, system="", max_tokens=1500):
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    if GROQ_KEY:
        r = call_api(
            "https://api.groq.com/openai/v1/chat/completions",
            {"Authorization": f"Bearer {GROQ_KEY}", "Content-Type": "application/json"},
            {"model": "llama-3.3-70b-versatile", "messages": messages,
             "max_tokens": max_tokens, "temperature": 0.65},
        )
        if r: return r

    if OPENROUTER_KEY:
        r = call_api(
            "https://openrouter.ai/api/v1/chat/completions",
            {"Authorization": f"Bearer {OPENROUTER_KEY}",
             "Content-Type": "application/json",
             "HTTP-Referer": "https://ai-academy-hub.vercel.app",
             "X-Title": "AI Academy Hub"},
            {"model": "meta-llama/llama-3.3-70b-instruct:free",
             "messages": messages, "max_tokens": max_tokens, "temperature": 0.65},
        )
        if r: return r
    return None

SYSTEM = """Tu es l'expert éditorial d'une plateforme de formations IA en français appelée AI Academy Hub.
Tu proposes des formations pertinentes, progressives et vendables à un public francophone.
Tes réponses sont concises, directement exploitables, sans explication superflue."""

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

# ── Écriture dans lib/courses.ts ──────────────────────────────────────────────
def append_course(course):
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

# ── Audit ─────────────────────────────────────────────────────────────────────
def audit():
    courses = read_courses()
    lines = [f"Catalogue actuel ({len(courses)} formations) :"]
    for c in courses:
        label = "gratuit" if c.get("free") else "premium"
        lines.append(f"  [{c.get('level','?'):14}] {c.get('title','?')} — {c.get('duration','?')}, {c.get('modules','?')} modules ({label})")
    return "\n".join(lines)

# ── Génération ────────────────────────────────────────────────────────────────
def propose_courses(audit_text, n=2):
    prompt = f"""{audit_text}

Règles de la plateforme :
- Niveaux : "Débutant", "Intermédiaire", "Avancé"
- free: true UNIQUEMENT pour les formations Débutant
- Les formations Intermédiaire et Avancé sont toujours free: false (premium)
- Durées typiques : Débutant 3-5h, Intermédiaire 6-10h, Avancé 10-20h
- Modules typiques : Débutant 6-8, Intermédiaire 10-14, Avancé 14-24

Propose {n} nouvelles formations qui complètent le catalogue sans doublons.
Choisir des sujets IA populaires et recherchés en 2026.

Réponds UNIQUEMENT avec un tableau JSON :
[
  {{
    "title": "Titre court et accrocheur",
    "desc": "Une phrase qui donne envie (max 80 caractères)",
    "level": "Débutant|Intermédiaire|Avancé",
    "duration": "Xh",
    "modules": 10,
    "free": false,
    "emoji": "🤖"
  }}
]"""
    result = llm(prompt, SYSTEM)
    if not result:
        return []
    try:
        m = re.search(r'\[.*\]', result, re.DOTALL)
        return json.loads(m.group(0)) if m else []
    except json.JSONDecodeError:
        return []

# ── Git push ──────────────────────────────────────────────────────────────────
def git_push(titles):
    try:
        subprocess.run(["git", "-C", str(BASE_DIR), "add", "lib/courses.ts"], check=True, capture_output=True)
        msg = f"content: add {len(titles)} formation(s) [{datetime.date.today()}]\n\n" + "\n".join(f"- {t}" for t in titles)
        subprocess.run(["git", "-C", str(BASE_DIR), "commit", "-m", msg], check=True, capture_output=True)
        subprocess.run(["git", "-C", str(BASE_DIR), "push", "origin", "main"], check=True, capture_output=True)
        return True
    except subprocess.CalledProcessError as e:
        print(f"  Git error: {e}", file=sys.stderr)
        return False

# ── Commandes ─────────────────────────────────────────────────────────────────
def cmd_full():
    print("AI Academy Hub — Content Manager", flush=True)
    LOGS_DIR.mkdir(exist_ok=True)

    audit_text = audit()
    print(audit_text, flush=True)
    print("\nGénération de nouvelles formations...", flush=True)
    proposals = propose_courses(audit_text, n=2)

    if not proposals:
        print("Aucune proposition générée", file=sys.stderr)
        telegram("⚠️ AI Academy Hub : content_manager n'a pas pu générer de nouvelles formations.")
        return

    existing = {c.get("title", "").lower() for c in read_courses()}
    courses  = read_courses()
    added    = []

    for p in proposals:
        if p.get("title", "").lower() in existing:
            print(f"  Déjà existant : {p['title']}", flush=True)
            continue
        p["id"]   = next_id(courses)
        p["free"] = (p.get("level") == "Débutant")
        append_course(p)
        courses.append(p)
        added.append(p["title"])
        label = "gratuit" if p["free"] else "premium"
        print(f"  + {p['title']} [{p['level']}, {label}]", flush=True)
        time.sleep(3)

    if not added:
        print("Aucune nouvelle formation ajoutée", file=sys.stderr)
        return

    pushed = git_push(added)

    log_file = LOGS_DIR / f"content_manager_{datetime.date.today().strftime('%Y%m%d')}.log"
    with open(log_file, "a") as f:
        f.write(f"[{datetime.datetime.now().isoformat()}] added: {added}\n")

    total = len(read_courses())
    telegram(
        f"🎓 *AI Academy Hub — {datetime.date.today().strftime('%d/%m/%Y')}*\n\n"
        f"✨ *{len(added)} formation(s) ajoutée(s) :*\n" +
        "\n".join(f"  • {t}" for t in added) +
        f"\n\n📊 Catalogue : *{total} formations*\n"
        f"{'✅ Déployé sur Vercel' if pushed else '⚠ Push échoué'}"
    )
    print(f"\n{len(added)} formation(s) ajoutée(s) {'et déployée(s)' if pushed else '(push échoué)'}.", flush=True)

def cmd_audit():
    print(audit())

def cmd_status():
    courses = read_courses()
    free = [c for c in courses if c.get("free")]
    paid = [c for c in courses if not c.get("free")]
    print(f"Catalogue : {len(courses)} formations ({len(free)} gratuites, {len(paid)} premium)")

if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "full"
    {"full": cmd_full, "audit": cmd_audit, "status": cmd_status}.get(cmd, cmd_full)()
