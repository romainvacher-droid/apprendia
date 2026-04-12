#!/usr/bin/env python3
"""
generate_content.py — Lance la génération de contenu pour AI Academy Hub.
1. Répare les cours avec des sections incomplètes (< 50 mots)
2. Génère des cours supplémentaires jusqu'à atteindre le quota demandé
"""
import sys, os, json, pathlib, re, time
sys.path.insert(0, str(pathlib.Path(__file__).parent))

# Importer depuis content_manager
from content_manager import (
    load_env, build_course, build_article, rebuild_index, git_commit,
    telegram_send, COURSES_DIR, ARTICLES_DIR, generate_section_content,
    SYSTEM_EDUCATOR, llm
)

load_env()

BASE_DIR     = pathlib.Path(__file__).resolve().parent.parent
COURSES_DIR  = BASE_DIR / "app" / "content" / "courses"
ARTICLES_DIR = BASE_DIR / "app" / "content" / "articles"

# ── Cours à générer ──────────────────────────────────────────────────────────
PLANNED_COURSES = [
    # ── Public (vitrine) ──────────────────────────────────────────────────────
    {
        "titre":    "Prompt Engineering : Maîtriser les Instructions LLM",
        "slug":     "prompt-engineering-llm",
        "catégorie": "llm-et-prompting",
        "niveau":   "intermédiaire",
        "angle":    "Techniques pratiques de prompting : zero-shot, few-shot, chain-of-thought, structured outputs, personas",
        "premium":  True,
    },
    {
        "titre":    "Créer son Premier Agent IA avec Python",
        "slug":     "premier-agent-ia-python",
        "catégorie": "agents-autonomes",
        "niveau":   "intermédiaire",
        "angle":    "Construire un agent avec boucle ReAct, outils, mémoire courte, utilisation d'une API LLM",
        "premium":  True,
    },
    {
        "titre":    "Réseaux de Neurones : Comprendre le Deep Learning",
        "slug":     "reseaux-neurones-deep-learning",
        "catégorie": "fondamentaux-ia",
        "niveau":   "débutant",
        "angle":    "Perceptron, couches, activation, rétropropagation, overfitting — explications visuelles sans code lourd",
        "premium":  False,
    },
    {
        "titre":    "MLOps : Déployer un Modèle en Production",
        "slug":     "mlops-deploiement-production",
        "catégorie": "mlops-et-deploiement",
        "niveau":   "avancé",
        "angle":    "Pipeline CI/CD ML, Docker, FastAPI, monitoring drift, versioning modèle avec MLflow",
        "premium":  True,
    },
    {
        "titre":    "Vision par Ordinateur avec YOLO et OpenCV",
        "slug":     "vision-ordinateur-yolo-opencv",
        "catégorie": "vision-par-ordinateur",
        "niveau":   "intermédiaire",
        "angle":    "Détection d'objets en temps réel, fine-tuning YOLO, intégration caméra, cas d'usage industriels",
        "premium":  True,
    },
    {
        "titre":    "IA Éthique et Responsable : Enjeux et Pratiques",
        "slug":     "ia-ethique-responsable",
        "catégorie": "ethique-et-ia-responsable",
        "niveau":   "débutant",
        "angle":    "Biais algorithmiques, RGPD et IA, explicabilité, exemples réels de dérives et bonnes pratiques",
        "premium":  False,
    },
]

PLANNED_ARTICLES = [
    {
        "titre":    "Les 5 modèles LLM open-source à connaître en 2026",
        "slug":     "top-llm-open-source-2026",
        "type":     "actualité",
        "sujet":    "llm",
        "angle":    "Comparer Llama 3, Mistral, Qwen, Gemma — performances, licence, usage local"
    },
    {
        "titre":    "RAG vs Fine-tuning : Quelle approche choisir ?",
        "slug":     "rag-vs-fine-tuning",
        "type":     "comparatif",
        "sujet":    "llm-et-prompting",
        "angle":    "Critères de choix : données propriétaires, coût, latence, fraîcheur de l'info"
    },
    {
        "titre":    "Automatiser ses tâches avec des agents IA",
        "slug":     "automatiser-taches-agents-ia",
        "type":     "pratique",
        "sujet":    "agents-autonomes",
        "angle":    "Exemples concrets : gestion emails, veille, génération de rapports, workflow n8n"
    },
]


def repair_broken_courses():
    """Régénère les sections avec contenu insuffisant (< 50 mots)."""
    import datetime
    repaired = 0
    for course_file in COURSES_DIR.glob("*.json"):
        data = json.loads(course_file.read_text(encoding="utf-8"))
        sections = data.get("sections", [])
        broken = [(i, s) for i, s in enumerate(sections) if len(s.get("content", "").split()) < 50]
        if not broken:
            continue

        print(f"  🔧 Réparation : {data['title']} ({len(broken)} sections vides)", flush=True)
        summaries = []
        for i, sec in enumerate(sections):
            if len(sec.get("content", "").split()) >= 50:
                summaries.append(f"{sec['title']} : {' '.join(sec.get('key_points', []))}")
            else:
                print(f"    → Section {i+1} : {sec['title'][:40]}...", flush=True)
                content = generate_section_content(data["title"], sec, i, summaries)
                if content and len(content.split()) >= 50:
                    sections[i]["content"] = content
                    summaries.append(f"{sec['title']} : {' '.join(sec.get('key_points', []))}")
                    repaired += 1
                    time.sleep(3)  # éviter rate limit
                else:
                    print(f"    ✗ Génération échouée pour section {i+1}", file=sys.stderr)

        data["sections"] = sections
        data["word_count"] = sum(len(s["content"].split()) for s in sections)
        data["updated_at"] = datetime.datetime.now().isoformat()
        course_file.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"    ✅ Réparé ({data['word_count']} mots)", flush=True)

    return repaired


def existing_slugs() -> set:
    slugs = set()
    for f in COURSES_DIR.glob("*.json"):
        slugs.add(f.stem)
    for f in ARTICLES_DIR.glob("*.json"):
        slugs.add(f.stem)
    return slugs


def main():
    print("🎓 AI Academy Hub — Génération de contenu", flush=True)

    # 1. Réparer les cours cassés
    print("\n🔧 Étape 1 : Réparation des cours incomplets...", flush=True)
    repaired = repair_broken_courses()
    print(f"  → {repaired} sections réparées", flush=True)

    # 2. Générer de nouveaux cours
    print("\n📘 Étape 2 : Génération de nouveaux cours...", flush=True)
    existing = existing_slugs()
    new_files = []

    for idea in PLANNED_COURSES:
        if idea["slug"] in existing:
            print(f"  ⏭  {idea['slug']} déjà existant, ignoré", flush=True)
            continue
        path = build_course(idea)
        if path:
            new_files.append(path)
            existing.add(idea["slug"])
            time.sleep(15)  # entre chaque cours
        else:
            print(f"  ✗ Échec : {idea['titre']}", file=sys.stderr)

    # 3. Générer de nouveaux articles
    print("\n📄 Étape 3 : Génération de nouveaux articles...", flush=True)
    for idea in PLANNED_ARTICLES:
        if idea["slug"] in existing:
            print(f"  ⏭  {idea['slug']} déjà existant, ignoré", flush=True)
            continue
        from content_manager import build_article
        path = build_article(idea)
        if path:
            new_files.append(path)
            existing.add(idea["slug"])
            time.sleep(3)
        else:
            print(f"  ✗ Échec : {idea['titre']}", file=sys.stderr)

    # 4. Rebuild index + commit
    print("\n📦 Étape 4 : Mise à jour de l'index...", flush=True)
    rebuild_index()

    if new_files:
        git_commit(new_files)
        total = len(list(COURSES_DIR.glob("*.json")))
        total_art = len(list(ARTICLES_DIR.glob("*.json")))
        titles = "\n".join(f"  • {p.stem}" for p in new_files)
        telegram_send(
            f"🎓 *AI Academy Hub — Génération de contenu*\n\n"
            f"✨ *{len(new_files)} nouveaux fichiers créés :*\n{titles}\n\n"
            f"📊 Total : *{total} cours*, *{total_art} articles*\n"
            f"✅ Index mis à jour et commit effectué"
        )
        print(f"\n✅ {len(new_files)} nouveaux contenus générés et commités.", flush=True)
    else:
        print("\n⚠ Aucun nouveau contenu généré.", flush=True)


if __name__ == "__main__":
    main()
