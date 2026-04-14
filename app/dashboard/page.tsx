import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { COURSES, LEVEL_COLORS } from "@/lib/courses";
import { getUserProgress } from "@/lib/progress";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login?from=/dashboard");

  const userId = Number((session.user as { id?: string }).id);
  const isPremium = (session.user as { isPremium?: boolean }).isPremium;

  const { visited, quizzes } = await getUserProgress(userId);

  const visitedIds = new Set(visited.map((r) => r.course_id));

  type QuizEntry = { course_id: number; score: number; total: number; completed_at: string };
  const bestQuiz: Record<number, QuizEntry> = {};
  for (const r of quizzes as QuizEntry[]) {
    if (!bestQuiz[r.course_id] || r.score > bestQuiz[r.course_id].score) {
      bestQuiz[r.course_id] = r;
    }
  }

  const accessibleCourses = COURSES.filter((c) => c.free || isPremium);
  const completedCount = accessibleCourses.filter((c) => visitedIds.has(c.id)).length;
  const quizCount = Object.keys(bestQuiz).length;
  const perfectCount = Object.values(bestQuiz).filter((q) => q.score === q.total).length;
  const progressPct = accessibleCourses.length > 0
    ? Math.round((completedCount / accessibleCourses.length) * 100)
    : 0;

  // Prochaine formation non consultée parmi les accessibles
  const nextCourse = accessibleCourses.find((c) => !visitedIds.has(c.id));

  // Formations premium verrouillées (pour les gratuits)
  const lockedCourses = !isPremium ? COURSES.filter((c) => !c.free) : [];

  return (
    <main className="max-w-3xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mon parcours</h1>
          <p className="text-gray-400 text-sm mt-1">{session.user?.name ?? session.user?.email}</p>
        </div>
        <Link href="/account" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
          Mon compte →
        </Link>
      </div>

      {/* Progression globale */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 mb-8 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-700 text-sm">Progression globale</h2>
          <span className="text-sm font-bold text-indigo-600">{progressPct}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2.5">
          <div
            className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-2">
          {completedCount} / {accessibleCourses.length} formations consultées
          {!isPremium && ` · ${lockedCourses.length} formations Premium disponibles`}
        </p>
      </div>

      {/* Stats globales */}
      <div className="grid grid-cols-3 gap-4 mb-10">
        <div className="bg-white border border-gray-100 rounded-2xl p-5 text-center shadow-sm">
          <p className="text-3xl font-bold text-indigo-600">{completedCount}</p>
          <p className="text-xs text-gray-400 mt-1">cours suivis</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-5 text-center shadow-sm">
          <p className="text-3xl font-bold text-indigo-600">{quizCount}</p>
          <p className="text-xs text-gray-400 mt-1">quiz complétés</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-5 text-center shadow-sm">
          <p className="text-3xl font-bold text-indigo-600">{perfectCount}</p>
          <p className="text-xs text-gray-400 mt-1">scores parfaits 🏆</p>
        </div>
      </div>

      {/* Prochaine formation recommandée */}
      {nextCourse && (
        <div className="mb-10">
          <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide mb-3">
            Continuer l&apos;apprentissage
          </h2>
          <Link
            href={`/formations/${nextCourse.id}`}
            className="flex items-center gap-4 bg-indigo-50 border border-indigo-100 rounded-2xl px-5 py-4 hover:border-indigo-300 hover:shadow-md transition-all group"
          >
            <span className="text-2xl">{nextCourse.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-indigo-900 text-sm">{nextCourse.title}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${LEVEL_COLORS[nextCourse.level]}`}>
                  {nextCourse.level}
                </span>
                <span className="text-xs text-indigo-400">⏱ {nextCourse.duration}</span>
              </div>
            </div>
            <span className="text-indigo-400 group-hover:translate-x-0.5 transition-transform text-lg">→</span>
          </Link>
        </div>
      )}

      {/* Liste des cours accessibles */}
      <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide mb-4">
        Formations accessibles
      </h2>
      <div className="space-y-3">
        {accessibleCourses.map((course) => {
          const isVisited = visitedIds.has(course.id);
          const quiz = bestQuiz[course.id];
          const pct = quiz ? Math.round((quiz.score / quiz.total) * 100) : null;

          return (
            <Link
              key={course.id}
              href={`/formations/${course.id}`}
              className="flex items-center gap-4 bg-white border border-gray-100 rounded-2xl px-5 py-4 shadow-sm hover:border-indigo-100 hover:shadow-md transition-all"
            >
              <span className="text-2xl">{course.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 text-sm truncate">{course.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">{course.level} · {course.duration}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {isVisited && (
                  <span className="text-xs text-green-600 bg-green-50 border border-green-100 px-2.5 py-1 rounded-full">
                    Consulté
                  </span>
                )}
                {pct !== null && (
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                    pct === 100
                      ? "bg-green-50 text-green-700 border-green-100"
                      : pct >= 50
                      ? "bg-amber-50 text-amber-700 border-amber-100"
                      : "bg-red-50 text-red-600 border-red-100"
                  }`}>
                    Quiz {quiz!.score}/{quiz!.total}
                  </span>
                )}
                {!isVisited && pct === null && (
                  <span className="text-xs text-gray-300">Non commencé</span>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Teaser formations Premium pour les gratuits */}
      {!isPremium && lockedCourses.length > 0 && (
        <div className="mt-12">
          <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide mb-4">
            Débloquer avec Premium
          </h2>
          <div className="space-y-2">
            {lockedCourses.slice(0, 4).map((c) => (
              <div key={c.id} className="flex items-center gap-4 bg-white border border-gray-100 rounded-2xl px-5 py-4 opacity-60">
                <span className="text-2xl grayscale">{c.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-700 text-sm truncate">{c.title}</p>
                  <p className="text-xs text-gray-400">{c.level} · {c.duration}</p>
                </div>
                <span className="text-xs text-gray-400 shrink-0">🔒</span>
              </div>
            ))}
            {lockedCourses.length > 4 && (
              <p className="text-xs text-gray-400 text-center py-2">
                + {lockedCourses.length - 4} autres formations…
              </p>
            )}
          </div>
          <div className="mt-6 text-center">
            <Link
              href="/account"
              className="inline-block bg-indigo-600 text-white text-sm px-6 py-3 rounded-full hover:bg-indigo-700 transition-colors font-medium"
            >
              Passer à Premium — 19€/mois
            </Link>
          </div>
        </div>
      )}

      {/* Historique quiz */}
      {quizzes.length > 0 && (
        <div className="mt-12">
          <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide mb-4">
            Historique des quiz
          </h2>
          <div className="space-y-2">
            {quizzes.slice(0, 10).map((r, i) => {
              const course = COURSES.find((c) => c.id === r.course_id);
              const pct = Math.round((r.score / r.total) * 100);
              return (
                <div key={i} className="flex items-center justify-between text-sm py-2.5 border-b border-gray-50">
                  <span className="text-gray-600 truncate mr-4">
                    {course?.emoji} {course?.title ?? `Formation #${r.course_id}`}
                  </span>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`font-semibold ${pct === 100 ? "text-green-600" : pct >= 50 ? "text-amber-600" : "text-red-500"}`}>
                      {r.score}/{r.total}
                    </span>
                    <span className="text-gray-300 text-xs">
                      {new Date(r.completed_at).toLocaleDateString("fr-FR")}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </main>
  );
}
