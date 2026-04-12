import { MetadataRoute } from "next";
import { COURSES } from "@/lib/courses";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://apprendia.vercel.app";

  const freeCourses = COURSES.filter((c) => c.free).map((c) => ({
    url: `${base}/formations/${c.id}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  return [
    { url: base, lastModified: new Date(), changeFrequency: "weekly", priority: 1.0 },
    { url: `${base}/formations`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    ...freeCourses,
  ];
}
