// Requêtes de progression centralisées — évite la duplication entre dashboard et API
import { sql } from "@/lib/db";
import type { CourseProgressRow, QuizResultRow } from "@/lib/types";

export async function getUserProgress(userId: number) {
  const [visited, quizzes] = await Promise.all([
    sql`SELECT user_id, course_id, visited_at FROM course_progress WHERE user_id = ${userId} ORDER BY visited_at DESC`,
    sql`SELECT id, user_id, course_id, score, total, completed_at FROM quiz_results WHERE user_id = ${userId} ORDER BY completed_at DESC`,
  ]);
  return {
    visited: visited as CourseProgressRow[],
    quizzes: quizzes as QuizResultRow[],
  };
}

export async function markCourseVisited(userId: number, courseId: number) {
  await sql`
    INSERT INTO course_progress (user_id, course_id)
    VALUES (${userId}, ${courseId})
    ON CONFLICT (user_id, course_id) DO NOTHING
  `;
}
