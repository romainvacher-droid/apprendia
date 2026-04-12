import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserProgress, markCourseVisited } from "@/lib/progress";
import { NextResponse } from "next/server";
import { z } from "zod";

// GET /api/progress — progression complète de l'utilisateur connecté
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = Number((session.user as { id?: string }).id);
    if (!userId) return NextResponse.json({ error: "No user id" }, { status: 400 });

    const { visited, quizzes } = await getUserProgress(userId);
    return NextResponse.json({ visited, quizzes });
  } catch {
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}

const ProgressSchema = z.object({
  courseId: z.number().int().positive(),
});

// POST /api/progress — marquer un cours comme visité
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = Number((session.user as { id?: string }).id);
    if (!userId) return NextResponse.json({ error: "No user id" }, { status: 400 });

    const body = await req.json();
    const result = ProgressSchema.safeParse(body);
    if (!result.success) return NextResponse.json({ error: "courseId invalide" }, { status: 400 });

    await markCourseVisited(userId, result.data.courseId);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
