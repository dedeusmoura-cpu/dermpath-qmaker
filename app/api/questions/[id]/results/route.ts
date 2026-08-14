import { eq, sql } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { questions, votes } from "../../../../../db/schema";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const questionId = Number(id); const db = getDb();
  const [question] = await db.select().from(questions).where(eq(questions.id, questionId)).limit(1);
  if (!question) return Response.json({ error: "Questão não encontrada." }, { status: 404 });
  const choices = JSON.parse(question.options) as string[]; const counts = Array.from({ length: choices.length }, () => 0);
  if (question.kind === "open" || question.kind === "cloud") {
    const rows = await db.select({ answerText: votes.answerText, count: sql<number>`count(*)` }).from(votes).where(eq(votes.questionId, questionId)).groupBy(votes.answerText);
    const answers = rows.filter((row) => row.answerText).map((row) => ({ text: row.answerText!, count: Number(row.count) })).sort((a, b) => b.count - a.count || a.text.localeCompare(b.text, "pt-BR"));
    return Response.json({ question: { ...question, options: choices }, answers, total: answers.reduce((sum, answer) => sum + answer.count, 0) });
  }
  const rows = await db.select({ answerIndex: votes.answerIndex, count: sql<number>`count(*)` }).from(votes).where(eq(votes.questionId, questionId)).groupBy(votes.answerIndex);
  rows.forEach((row) => { counts[row.answerIndex] = Number(row.count); });
  return Response.json({ question: { ...question, options: choices }, counts, total: counts.reduce((sum, value) => sum + value, 0) });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; await getDb().delete(votes).where(eq(votes.questionId, Number(id)));
  return Response.json({ ok: true });
}
