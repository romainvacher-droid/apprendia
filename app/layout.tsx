import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Providers from "./components/Providers";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Apprendia — Formations IA tous niveaux",
  description: "Apprenez l'intelligence artificielle de zéro à expert avec Apprendia. Formations pratiques, certifiantes et accessibles à tous.",
  metadataBase: new URL("https://apprendia.vercel.app"),
  openGraph: {
    title: "Apprendia — Formations IA tous niveaux",
    description: "Des formations pratiques pour comprendre, utiliser et créer avec l'IA — du débutant à l'expert.",
    url: "https://apprendia.vercel.app",
    siteName: "Apprendia",
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Apprendia — Formations IA tous niveaux",
    description: "Des formations pratiques pour apprendre l'IA de zéro à expert.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${geist.variable} h-full antialiased scroll-smooth`}>
      <body className="min-h-full flex flex-col bg-white text-gray-900">
        <Providers>
          <Navbar />
          <div className="flex-1">{children}</div>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
