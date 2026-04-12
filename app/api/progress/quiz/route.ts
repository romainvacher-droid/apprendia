import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sql } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = Number((session.user as { id?: string }).id);
  if (!userId) return NextResponse.json({ error: "No user id" }, { status: 400 });

  const { courseId, score, total } = await req.json();
  if (courseId == null || score == null || total == null)
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  await sql`
    INSERT INTO quiz_results (user_id, course_id, score, total)
    VALUES (${userId}, ${courseId}, ${score}, ${total})
  `;

  // Marque aussi le cours comme visité si ce n'est pas déjà fait
  await sql`
    INSERT INTO course_progress (user_id, course_id)
    VALUES (${userId}, ${courseId})
    ON CONFLICT (user_id, course_id) DO NOTHING
  `;

  return NextResponse.json({ ok: true });
}
