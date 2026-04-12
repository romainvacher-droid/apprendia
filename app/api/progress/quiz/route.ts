import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sql } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";

const QuizSchema = z.object({
  courseId: z.number().int().positive(),
  score: z.number().int().min(0),
  total: z.number().int().positive(),
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = Number((session.user as { id?: string }).id);
    if (!userId) return NextResponse.json({ error: "No user id" }, { status: 400 });

    const body = await req.json();
    const result = QuizSchema.safeParse(body);
    if (!result.success) return NextResponse.json({ error: "Données invalides" }, { status: 400 });

    const { courseId, score, total } = result.data;

    await sql`
      INSERT INTO quiz_results (user_id, course_id, score, total)
      VALUES (${userId}, ${courseId}, ${score}, ${total})
    `;
    await sql`
      INSERT INTO course_progress (user_id, course_id)
      VALUES (${userId}, ${courseId})
      ON CONFLICT (user_id, course_id) DO NOTHING
    `;

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
