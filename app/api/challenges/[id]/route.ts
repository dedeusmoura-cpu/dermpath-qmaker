import { asc, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { challengeQuestions, challenges, questions } from "../../../../db/schema";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const challengeId = Number(id); const db = getDb();
  const [challenge] = await db.select().from(challenges).where(eq(challenges.id, challengeId)).limit(1);
  if (!challenge) return Response.json({ error: "Desafio não encontrado." }, { status: 404 });
  const rows = await db.select({ question: questions, position: challengeQuestions.position }).from(challengeQuestions).innerJoin(questions, eq(challengeQuestions.questionId, questions.id)).where(eq(challengeQuestions.challengeId, challengeId)).orderBy(asc(challengeQuestions.position));
  return Response.json({ challenge: { ...challenge, questions: rows.map(({ question, position }) => ({ ...question, position, options: JSON.parse(question.options) })) } });
}
