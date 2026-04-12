import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Link from "next/link";
import fs from "fs";
import path from "path";
import type { Metadata } from "next";
import { authOptions } from "@/lib/auth";
import { COURSES, LEVEL_COLORS } from "@/lib/courses";
import QuizBlock from "./QuizBlock";
import TrackProgress from "./TrackProgress";

interface Section {
  title: string;
  content: string;
  key_points?: string[];
}

interface QuizQuestion {
  question: string;
  choices: string[];
  answer: string;
  explanation: string;
}

interface CourseContent {
  id: number;
  sections: Section[];
  quiz?: QuizQuestion[];
  generated_at?: string;
}

function getCourseContent(id: number): CourseContent | null {
  const p = path.join(process.cwd(), "content", "courses", `${id}.json`);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf-8"));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const course = COURSES.find((c) => c.id === parseInt(id, 10));
  if (!course) return {};
  return {
    title: `${course.title} — Apprendia`,
    description: course.desc,
    openGraph: {
      title: `${course.title} — Formation IA`,
      description: course.desc,
      url: `https://apprendia.vercel.app/formations/${course.id}`,
      type: "article",
    },
    twitter: {
      card: "summary",
      title: course.title,
      description: course.desc,
    },
  };
}

export async function generateStaticParams() {
  return COURSES.filter((c) => c.free).map((c) => ({ id: String(c.id) }));
}

export const dynamicParams = true;

export default async function FormationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const courseId = parseInt(id, 10);
  const course = COURSES.find((c) => c.id === courseId);
  if (!course) notFound();

  const session = await getServerSession(authOptions);

  // Contrôle d'accès pour les formations premium
  if (!course.free) {
    if (!session) redirect(`/login?from=/formations/${id}`);
    const isPremium = (session.user as { isPremium?: boolean })?.isPremium;
    if (!isPremium) redirect(`/formations?upgrade=1`);
  }

  const content = getCourseContent(courseId);

  // Le tracking de visite est géré côté client par <TrackProgress>
  // (évite les effets de bord dans un Server Component)

  return (
    <main className="max-w-3xl mx-auto px-6 py-12">
      {/* Tracking visite côté client — sans effet de bord dans le Server Component */}
      <TrackProgress courseId={courseId} />
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-8">
        <Link href="/formations" className="hover:text-gray-600 transition-colors">
          Formations
        </Link>
        <span>/</span>
        <span className="text-gray-600">{course.title}</span>
      </div>

      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">{course.emoji}</span>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${LEVEL_COLORS[course.level]}`}>
            {course.level}
          </span>
          {!course.free && (
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
              Premium
            </span>
          )}
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3 leading-tight">{course.title}</h1>
        <p className="text-gray-500 text-lg">{course.desc}</p>
        <div className="flex items-center gap-4 mt-4 text-sm text-gray-400">
          <span>⏱ {course.duration}</span>
          <span>📦 {course.modules} modules</span>
        </div>
      </div>

      {/* Pas encore de contenu généré */}
      {!content && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-8 text-center">
          <div className="text-3xl mb-3">🔄</div>
          <h2 className="font-semibold text-indigo-800 mb-2">Contenu en cours de génération</h2>
          <p className="text-indigo-600 text-sm">
            Ce module sera disponible très prochainement. Revenez dans quelques heures.
          </p>
        </div>
      )}

      {/* Contenu du cours */}
      {content && (
        <>
          <div className="space-y-10 mb-14">
            {content.sections.map((section, i) => (
              <div key={i} className="border-l-2 border-indigo-100 pl-6">
                <h2 className="font-semibold text-gray-900 mb-3 text-lg">
                  <span className="text-indigo-300 font-normal mr-2 text-sm">
                    {String(i + 1).padStart(2, "0")}.
                  </span>
                  {section.title}
                </h2>
                <div className="space-y-3">
                  {section.content.split("\n\n").map((para, j) => (
                    <p key={j} className="text-gray-600 leading-relaxed text-sm">
                      {para}
                    </p>
                  ))}
                </div>
                {section.key_points && section.key_points.length > 0 && (
                  <div className="mt-4 bg-gray-50 rounded-xl p-4">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                      À retenir
                    </p>
                    <ul className="space-y-1">
                      {section.key_points.map((kp, k) => (
                        <li key={k} className="text-sm text-gray-600 flex items-start gap-2">
                          <span className="text-indigo-400 shrink-0 mt-0.5">✓</span>
                          {kp}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Quiz */}
          {content.quiz && content.quiz.length > 0 && (
            <QuizBlock questions={content.quiz} courseId={courseId} />
          )}
        </>
      )}

      {/* Retour */}
      <div className="mt-12 pt-8 border-t border-gray-100">
        <Link
          href="/formations"
          className="text-sm text-gray-400 hover:text-gray-700 transition-colors"
        >
          ← Retour aux formations
        </Link>
      </div>
    </main>
  );
}
