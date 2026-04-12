"use client";
import { useEffect } from "react";
import { useSession } from "next-auth/react";

export default function TrackProgress({ courseId }: { courseId: number }) {
  const { data: session } = useSession();

  useEffect(() => {
    if (!session) return;
    fetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId }),
    }).catch(() => {});
  }, [session, courseId]);

  return null;
}
