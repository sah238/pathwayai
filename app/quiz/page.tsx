import type { Metadata } from "next";
import { Quiz } from "@/components/quiz/Quiz";

export const metadata: Metadata = {
  title: "Values quiz · PathwayAI",
  description: "Answer 11 quick questions to find careers that fit you.",
};

export default function QuizPage() {
  return <Quiz />;
}
