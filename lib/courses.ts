// ============================================================
// FICHIER PRINCIPAL DES FORMATIONS
// Pour ajouter une formation : ajouter un objet dans ce tableau.
// ============================================================

export type Level = "Débutant" | "Intermédiaire" | "Avancé";

export interface Course {
  id: number;
  title: string;
  desc: string;
  level: Level;
  duration: string;   // ex: "3h", "12h"
  modules: number;    // nombre de modules
  free: boolean;      // true = gratuit, false = premium
  emoji: string;      // un seul emoji représentant la formation
}

export const COURSES: Course[] = [
  {
    id: 1,
    title: "Introduction à l'IA",
    desc: "Comprendre comment fonctionne l'IA sans prérequis.",
    level: "Débutant",
    duration: "3h",
    modules: 6,
    free: true,
    emoji: "🌱",
  },
  {
    id: 2,
    title: "Prompt Engineering",
    desc: "Maîtrisez la communication avec les LLMs.",
    level: "Débutant",
    duration: "5h",
    modules: 8,
    free: true,
    emoji: "✍️",
  },
  {
    id: 3,
    title: "ChatGPT pour les pros",
    desc: "Utilisez ChatGPT pour gagner du temps au travail.",
    level: "Débutant",
    duration: "4h",
    modules: 7,
    free: true,
    emoji: "💼",
  },
  {
    id: 4,
    title: "Automatisation avec l'IA",
    desc: "Workflows intelligents avec Make, Zapier et APIs LLM.",
    level: "Intermédiaire",
    duration: "8h",
    modules: 12,
    free: false,
    emoji: "⚙️",
  },
  {
    id: 5,
    title: "RAG & bases vectorielles",
    desc: "Connectez vos données à un LLM avec Pinecone ou pgvector.",
    level: "Intermédiaire",
    duration: "10h",
    modules: 14,
    free: false,
    emoji: "📚",
  },
  {
    id: 6,
    title: "IA pour le marketing",
    desc: "Génération de contenu, SEO et analyse de données.",
    level: "Intermédiaire",
    duration: "6h",
    modules: 9,
    free: false,
    emoji: "📣",
  },
  {
    id: 7,
    title: "Créer son agent IA",
    desc: "Développez des agents autonomes capables de raisonner.",
    level: "Avancé",
    duration: "12h",
    modules: 16,
    free: false,
    emoji: "🤖",
  },
  {
    id: 8,
    title: "Fine-tuning de LLMs",
    desc: "Entraînez vos propres modèles sur vos données.",
    level: "Avancé",
    duration: "15h",
    modules: 18,
    free: false,
    emoji: "🧬",
  },
  {
    id: 9,
    title: "Déployer une app IA",
    desc: "Construisez et déployez un produit IA de A à Z.",
    level: "Avancé",
    duration: "20h",
    modules: 24,
    free: false,
    emoji: "🚀",
  },
  {
    id: 10,
    title: "IA Générative pour les Créatifs",
    desc: "Maîtrisez les outils d'IA pour le design et la création.",
    level: "Intermédiaire",
    duration: "8h",
    modules: 12,
    free: false,
    emoji: "🎨",
  },
  {
    id: 11,
    title: "Éthique et IA Responsable",
    desc: "Enjeux éthiques, biais algorithmiques et cadre juridique.",
    level: "Intermédiaire",
    duration: "6h",
    modules: 9,
    free: false,
    emoji: "⚖️",
  },
  {
    id: 12,
    title: "IA et Web3 : Données Décentralisées",
    desc: "Combinez IA et blockchain pour des systèmes intelligents.",
    level: "Avancé",
    duration: "8h",
    modules: 12,
    free: false,
    emoji: "🔗",
  },
  {
    id: 13,
    title: "MLOps : Déployer et Monitorer ses Modèles",
    desc: "Mettez vos modèles en production et suivez leurs performances.",
    level: "Avancé",
    duration: "12h",
    modules: 15,
    free: false,
    emoji: "🧪",
  },
  {
    id: 14,
    title: "IA Appliquée : Cas Concrets Métiers",
    desc: "Études de cas réels : santé, finance, RH, logistique.",
    level: "Intermédiaire",
    duration: "8h",
    modules: 12,
    free: false,
    emoji: "🏥",
  },
  {
    id: 15,
    title: "Agent IA Multi-Modal Autonome",
    desc: "Concevez des agents combinant texte, image et audio.",
    level: "Avancé",
    duration: "15h",
    modules: 18,
    free: false,
    emoji: "🛠️",
  },
  {
    id: 16,
    title: "IA Quantique : La Next-Gen",
    desc: "Découvrez les bases de l'IA quantique et ses applications révolutionnaires",
    level: "Intermédiaire",
    duration: "8h",
    modules: 12,
    free: false,
    emoji: "⚛️",
  },
  {
    id: 17,
    title: "Agents IA Collaboratifs",
    desc: "Construisez des systèmes multi-agents pour résoudre des problèmes complexes",
    level: "Avancé",
    duration: "14h",
    modules: 18,
    free: false,
    emoji: "🤖",
  },
];

// Couleurs par niveau (Tailwind classes)
export const LEVEL_COLORS: Record<Level, string> = {
  "Débutant":      "bg-green-100 text-green-700",
  "Intermédiaire": "bg-orange-100 text-orange-700",
  "Avancé":        "bg-purple-100 text-purple-700",
};
