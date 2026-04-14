"use client";

import { useState, useRef } from "react";

interface QuizQuestion {
  question: string;
  choices: string[];
  answer: string;
  explanation: string;
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function QuizBlock({
  questions,
  courseId,
}: {
  questions: QuizQuestion[];
  courseId: number;
}) {
  // Ordre des choix mélangé une fois au montage, restabilisé sur reset via shuffleKey
  const [shuffleKey, setShuffleKey] = useState(0);
  const shuffledChoicesRef = useRef<string[][]>(
    questions.map((q) => shuffleArray(q.choices))
  );
  const shuffledChoices = shuffledChoicesRef.current;

  const [selected, setSelected] = useState<(string | null)[]>(
    Array(questions.length).fill(null)
  );
  const [submitted, setSubmitted] = useState(false);

  const allAnswered = selected.every((s) => s !== null);
  const answeredCount = selected.filter(Boolean).length;
  const score = submitted
    ? selected.filter((s, i) => s?.startsWith(questions[i].answer)).length
    : 0;

  function pick(qIdx: number, choice: string) {
    if (submitted) return;
    setSelected((prev) => prev.map((v, i) => (i === qIdx ? choice : v)));
  }

  async function submit() {
    const s = selected.filter((a, i) => a?.startsWith(questions[i].answer)).length;
    setSubmitted(true);
    await fetch("/api/progress/quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId, score: s, total: questions.length }),
    }).catch(() => {});
  }

  function reset() {
    setSelected(Array(questions.length).fill(null));
    setSubmitted(false);
    shuffledChoicesRef.current = questions.map((q) => shuffleArray(q.choices));
    setShuffleKey((k) => k + 1);
  }

  return (
    <div className="border border-gray-100 rounded-2xl p-6 bg-white shadow-sm">
      <h2 className="font-semibold text-gray-900 mb-2 flex items-center gap-2 text-lg">
        <span>🎯</span> Quiz de validation
      </h2>
      <p className="text-sm text-gray-400 mb-6">{questions.length} questions · Validez votre compréhension</p>

      <div key={shuffleKey} className="space-y-8">
        {questions.map((q, i) => {
          const userAnswer = selected[i];
          const correct = q.answer;
          return (
            <div key={i}>
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  submitted
                    ? selected[i]?.startsWith(correct)
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-600"
                    : userAnswer
                    ? "bg-indigo-100 text-indigo-700"
                    : "bg-gray-100 text-gray-400"
                }`}>
                  Q{i + 1} / {questions.length}
                </span>
                {submitted && (
                  selected[i]?.startsWith(correct)
                    ? <span className="text-xs text-green-600">✓ Correct</span>
                    : <span className="text-xs text-red-500">✗ Incorrect</span>
                )}
              </div>
              <p className="font-medium text-gray-900 mb-3 text-sm leading-relaxed">
                {q.question}
              </p>
              <ul className="space-y-2 mb-3">
                {shuffledChoices[i].map((choice, j) => {
                  const isSelected = userAnswer === choice;
                  const isCorrect = choice.startsWith(correct);

                  let style =
                    "border-gray-100 text-gray-600 hover:border-indigo-200 hover:bg-indigo-50 cursor-pointer";

                  if (submitted) {
                    if (isCorrect)
                      style = "border-green-200 bg-green-50 text-green-800 cursor-default font-medium";
                    else if (isSelected && !isCorrect)
                      style = "border-red-200 bg-red-50 text-red-700 cursor-default";
                    else
                      style = "border-gray-100 text-gray-400 cursor-default";
                  } else if (isSelected) {
                    style = "border-indigo-300 bg-indigo-50 text-indigo-800 cursor-pointer";
                  }

                  return (
                    <li
                      key={j}
                      onClick={() => pick(i, choice)}
                      className={`text-sm px-4 py-2.5 rounded-xl border transition-colors select-none ${style}`}
                    >
                      {submitted && isCorrect && <span className="mr-1.5">✓</span>}
                      {submitted && isSelected && !isCorrect && <span className="mr-1.5">✗</span>}
                      {choice}
                    </li>
                  );
                })}
              </ul>
              {submitted && (
                <div className="bg-gray-50 rounded-xl px-4 py-3 mt-2">
                  <p className="text-xs text-gray-500 leading-relaxed">
                    <span className="font-medium text-gray-700">Explication : </span>
                    {q.explanation}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Score */}
      {submitted && (
        <div
          className={`mt-8 rounded-2xl px-5 py-5 flex items-center justify-between ${
            score === questions.length
              ? "bg-green-50 border border-green-100"
              : score >= questions.length / 2
              ? "bg-amber-50 border border-amber-100"
              : "bg-red-50 border border-red-100"
          }`}
        >
          <div>
            <p className="font-bold text-gray-800 text-lg">
              {score === questions.length
                ? "🏆 Parfait !"
                : score >= questions.length / 2
                ? "👍 Pas mal !"
                : "📚 À réviser"}
            </p>
            <p className="text-sm text-gray-500 mt-0.5">
              {score} bonne{score > 1 ? "s" : ""} réponse{score > 1 ? "s" : ""} sur {questions.length}
            </p>
          </div>
          <button
            onClick={reset}
            className="text-sm text-gray-500 hover:text-gray-800 transition-colors border border-gray-200 px-4 py-2 rounded-xl hover:bg-white"
          >
            Recommencer
          </button>
        </div>
      )}

      {/* Bouton valider */}
      {!submitted && (
        <button
          onClick={submit}
          disabled={!allAnswered}
          className={`mt-8 w-full py-3 rounded-2xl text-sm font-semibold transition-colors ${
            allAnswered
              ? "bg-indigo-600 text-white hover:bg-indigo-700"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          {allAnswered
            ? "Valider mes réponses"
            : `Répondre à toutes les questions (${answeredCount}/${questions.length})`}
        </button>
      )}
    </div>
  );
}
