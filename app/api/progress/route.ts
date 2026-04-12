import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sql } from "@/lib/db";
import { NextResponse } from "next/server";

// GET /api/progress — progression complète de l'utilisateur connecté
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id?: string }).id;
  if (!userId) return NextResponse.json({ error: "No user id" }, { status: 400 });

  const [visited, quizzes] = await Promise.all([
    sql`SELECT course_id, visited_at FROM course_progress WHERE user_id = ${Number(userId)} ORDER BY visited_at DESC`,
    sql`SELECT course_id, score, total, completed_at FROM quiz_results WHERE user_id = ${Number(userId)} ORDER BY completed_at DESC`,
  ]);

  return NextResponse.json({ visited, quizzes });
}

// POST /api/progress — marquer un cours comme visité
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id?: number }).id;
  if (!userId) return NextResponse.json({ error: "No user id" }, { status: 400 });

  const { courseId } = await req.json();
  if (!courseId) return NextResponse.json({ error: "Missing courseId" }, { status: 400 });

  await sql`
    INSERT INTO course_progress (user_id, course_id)
    VALUES (${userId}, ${courseId})
    ON CONFLICT (user_id, course_id) DO NOTHING
  `;

  return NextResponse.json({ ok: true });
}
