#!/usr/bin/env python3
"""
hourly_status.py — Rapport horaire Apprendia envoyé par Telegram.
Appelé par cron toutes les heures. N'envoie un message QUE si une tâche
de génération de contenu est en cours (processus actif ou fichiers récents).
"""
import os, sys, json, pathlib, subprocess, datetime, time

BASE_DIR    = pathlib.Path(__file__).resolve().parent.parent
CONTENT_DIR = BASE_DIR / "content" / "courses"
COURSES_FILE = BASE_DIR / "lib" / "courses.ts"
LOGS_DIR    = BASE_DIR / "logs"

TELEGRAM_USER_ID = "8174597010"

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

def telegram(msg: str):
    try:
        subprocess.run(
            ["openclaw", "message", "send", "--channel", "telegram",
             "-t", TELEGRAM_USER_ID, "-m", msg],
            capture_output=True, timeout=15
        )
    except Exception:
        pass

def is_generation_running() -> bool:
    """Vérifie si content_manager.py est en train de tourner."""
    try:
        result = subprocess.run(
            ["pgrep", "-f", "content_manager.py"],
            capture_output=True, text=True
        )
        return result.returncode == 0
    except Exception:
        return False

def recently_modified(path: pathlib.Path, minutes: int = 65) -> bool:
    """Fichier modifié dans les N dernières minutes."""
    if not path.exists():
        return False
    age = time.time() - path.stat().st_mtime
    return age < (minutes * 60)

def read_courses():
    import re
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

def build_report() -> str:
    courses  = read_courses()
    total    = len(courses)
    done     = [c for c in courses if (CONTENT_DIR / f"{c['id']}.json").exists()]
    missing  = [c for c in courses if c not in done]
    running  = is_generation_running()

    now = datetime.datetime.now().strftime("%d/%m/%Y %H:%M")
    lines = [f"📊 *Apprendia — rapport {now}*\n"]
    lines.append(f"Contenu : {len(done)}/{total} formations générées")

    if done:
        lines.append("\n✅ *Terminées :*")
        for c in done:
            f = CONTENT_DIR / f"{c['id']}.json"
            data = json.loads(f.read_text())
            lines.append(f"  • {c['title']} ({data.get('word_count', '?')} mots)")

    if missing:
        lines.append("\n⏳ *En attente :*")
        for c in missing:
            lines.append(f"  • {c['title']} [{c.get('level','?')}]")

    status = "🔄 Génération en cours" if running else "💤 Aucune tâche active"
    lines.append(f"\n{status}")
    return "\n".join(lines)

def any_task_active() -> bool:
    """Envoie le rapport uniquement si une génération est en cours OU si des
    fichiers ont été créés récemment (tâche terminée dans la dernière heure)."""
    if is_generation_running():
        return True
    # fichiers de contenu modifiés récemment ?
    for f in CONTENT_DIR.glob("*.json"):
        if recently_modified(f, minutes=65):
            return True
    return False

if __name__ == "__main__":
    if any_task_active():
        report = build_report()
        telegram(report)
        print(report)
    else:
        print("Aucune tâche active — rapport non envoyé.")
