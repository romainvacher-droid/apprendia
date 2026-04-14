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
  const courseIndex = COURSES.findIndex((c) => c.id === courseId);
  if (courseIndex === -1) notFound();
  const course = COURSES[courseIndex];

  const session = await getServerSession(authOptions);

  if (!course.free) {
    if (!session) redirect(`/login?from=/formations/${id}`);
    const isPremium = (session.user as { isPremium?: boolean })?.isPremium;
    if (!isPremium) redirect(`/formations?upgrade=1`);
  }

  const content = getCourseContent(courseId);

  // Navigation précédent / suivant
  const prevCourse = courseIndex > 0 ? COURSES[courseIndex - 1] : null;
  const nextCourse = courseIndex < COURSES.length - 1 ? COURSES[courseIndex + 1] : null;

  return (
    <main className="max-w-3xl mx-auto px-6 py-12">
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
          {content && <span>📝 {content.sections.length} sections</span>}
        </div>
      </div>

      {/* Table des matières */}
      {content && content.sections.length > 0 && (
        <details className="mb-10 border border-gray-100 rounded-2xl overflow-hidden group">
          <summary className="px-5 py-4 cursor-pointer text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-between list-none select-none">
            <span>📋 Table des matières — {content.sections.length} sections</span>
            <span className="text-gray-400 text-xs group-open:hidden">Afficher ↓</span>
            <span className="text-gray-400 text-xs hidden group-open:inline">Masquer ↑</span>
          </summary>
          <ol className="px-5 py-4 space-y-2 border-t border-gray-100 bg-gray-50/50">
            {content.sections.map((s, i) => (
              <li key={i}>
                <a href={`#section-${i}`} className="text-sm text-indigo-600 hover:underline flex items-center gap-2">
                  <span className="text-gray-400 font-mono text-xs w-6 shrink-0">
                    {String(i + 1).padStart(2, "0")}.
                  </span>
                  {s.title}
                </a>
              </li>
            ))}
            {content.quiz && content.quiz.length > 0 && (
              <li>
                <a href="#quiz" className="text-sm text-indigo-600 hover:underline flex items-center gap-2">
                  <span className="text-gray-400 font-mono text-xs w-6 shrink-0">🎯</span>
                  Quiz de validation
                </a>
              </li>
            )}
          </ol>
        </details>
      )}

      {/* Contenu en génération */}
      {!content && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-8 text-center">
          <div className="text-3xl mb-3">🔄</div>
          <h2 className="font-semibold text-indigo-800 mb-2">Contenu en cours de génération</h2>
          <p className="text-indigo-600 text-sm">
            Ce module sera disponible très prochainement. Revenez dans quelques heures.
          </p>
        </div>
      )}

      {/* Sections */}
      {content && (
        <>
          <div className="space-y-12 mb-14">
            {content.sections.map((section, i) => (
              <div key={i} id={`section-${i}`} className="border-l-2 border-indigo-100 pl-6 scroll-mt-24">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-mono text-indigo-300">
                    {String(i + 1).padStart(2, "0")} / {content.sections.length}
                  </span>
                </div>
                <h2 className="font-semibold text-gray-900 mb-4 text-xl leading-snug">
                  {section.title}
                </h2>
                <div className="space-y-4">
                  {section.content.split("\n\n").map((para, j) => (
                    <p key={j} className="text-gray-600 leading-relaxed text-base">
                      {para}
                    </p>
                  ))}
                </div>
                {section.key_points && section.key_points.length > 0 && (
                  <div className="mt-6 bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                    <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wide mb-3">
                      À retenir
                    </p>
                    <ul className="space-y-2">
                      {section.key_points.map((kp, k) => (
                        <li key={k} className="text-sm text-gray-700 flex items-start gap-2">
                          <span className="text-indigo-400 shrink-0 mt-0.5 font-bold">✓</span>
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
            <div id="quiz" className="scroll-mt-24">
              <QuizBlock questions={content.quiz} courseId={courseId} />
            </div>
          )}
        </>
      )}

      {/* Navigation précédent / suivant */}
      <div className="mt-12 pt-8 border-t border-gray-100 flex items-center justify-between gap-4">
        <div>
          {prevCourse ? (
            <Link
              href={`/formations/${prevCourse.id}`}
              className="group flex items-center gap-2 text-sm text-gray-400 hover:text-gray-700 transition-colors"
            >
              <span className="group-hover:-translate-x-0.5 transition-transform">←</span>
              <div>
                <p className="text-xs text-gray-300">Précédent</p>
                <p className="font-medium text-gray-600 group-hover:text-gray-900 transition-colors">{prevCourse.title}</p>
              </div>
            </Link>
          ) : (
            <Link href="/formations" className="text-sm text-gray-400 hover:text-gray-700 transition-colors">
              ← Retour aux formations
            </Link>
          )}
        </div>
        <div className="text-right">
          {nextCourse && (
            <Link
              href={`/formations/${nextCourse.id}`}
              className="group flex items-center gap-2 text-sm text-gray-400 hover:text-gray-700 transition-colors"
            >
              <div>
                <p className="text-xs text-gray-300 text-right">Suivant</p>
                <p className="font-medium text-gray-600 group-hover:text-gray-900 transition-colors">{nextCourse.title}</p>
              </div>
              <span className="group-hover:translate-x-0.5 transition-transform">→</span>
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
