"use client";

import { useState } from "react";

interface QuizQuestion {
  question: string;
  choices: string[];
  answer: string;
  explanation: string;
}

export default function QuizBlock({
  questions,
  courseId,
}: {
  questions: QuizQuestion[];
  courseId: number;
}) {
  const [selected, setSelected] = useState<(string | null)[]>(
    Array(questions.length).fill(null)
  );
  const [submitted, setSubmitted] = useState(false);

  const allAnswered = selected.every((s) => s !== null);
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
  }

  return (
    <div className="border border-gray-100 rounded-2xl p-6 bg-white shadow-sm">
      <h2 className="font-semibold text-gray-900 mb-6 flex items-center gap-2">
        <span>🎯</span> Quiz de validation ({questions.length} questions)
      </h2>

      <div className="space-y-8">
        {questions.map((q, i) => {
          const userAnswer = selected[i];
          const correct = q.answer;
          return (
            <div key={i}>
              <p className="font-medium text-gray-900 mb-3 text-sm">
                {i + 1}. {q.question}
              </p>
              <ul className="space-y-2 mb-3">
                {q.choices.map((choice, j) => {
                  const isSelected = userAnswer === choice;
                  const isCorrect = choice.startsWith(correct);

                  let style =
                    "border-gray-100 text-gray-600 hover:border-indigo-200 hover:bg-indigo-50 cursor-pointer";

                  if (submitted) {
                    if (isCorrect)
                      style = "border-green-200 bg-green-50 text-green-800 cursor-default";
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
                      className={`text-sm px-3 py-2 rounded-lg border transition-colors select-none ${style}`}
                    >
                      {submitted && isCorrect && <span className="mr-1">✓</span>}
                      {submitted && isSelected && !isCorrect && <span className="mr-1">✗</span>}
                      {choice}
                    </li>
                  );
                })}
              </ul>
              {submitted && (
                <p className="text-xs text-gray-400 italic">{q.explanation}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Score */}
      {submitted && (
        <div
          className={`mt-6 rounded-xl px-5 py-4 flex items-center justify-between ${
            score === questions.length
              ? "bg-green-50 border border-green-100"
              : score >= questions.length / 2
              ? "bg-amber-50 border border-amber-100"
              : "bg-red-50 border border-red-100"
          }`}
        >
          <p className="font-semibold text-gray-800">
            {score === questions.length
              ? "🏆 Parfait !"
              : score >= questions.length / 2
              ? "👍 Pas mal !"
              : "📚 À réviser"}
            <span className="ml-2 font-normal text-gray-500 text-sm">
              {score}/{questions.length} bonne{score > 1 ? "s" : ""} réponse
              {score > 1 ? "s" : ""}
            </span>
          </p>
          <button
            onClick={reset}
            className="text-sm text-gray-400 hover:text-gray-700 transition-colors underline underline-offset-2"
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
          className={`mt-6 w-full py-2.5 rounded-xl text-sm font-semibold transition-colors ${
            allAnswered
              ? "bg-indigo-600 text-white hover:bg-indigo-700"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          {allAnswered ? "Valider mes réponses" : `Répondre à toutes les questions (${selected.filter(Boolean).length}/${questions.length})`}
        </button>
      )}
    </div>
  );
}
