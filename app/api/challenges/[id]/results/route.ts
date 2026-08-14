import { asc, count, desc, eq, sql } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { challengeAnswers, challengeParticipants, challengeQuestions, challenges, questions } from "../../../../../db/schema";
import { requireTeacherPin } from "../../../_lib/teacher-auth";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const challengeId = Number(id); const db = getDb();
  const [challenge] = await db.select().from(challenges).where(eq(challenges.id, challengeId)).limit(1);
  if (!challenge) return Response.json({ error: "Desafio não encontrado." }, { status: 404 });
  const [questionCount] = await db.select({ total: count() }).from(challengeQuestions).where(eq(challengeQuestions.challengeId, challengeId));
  const ranking = await db.select({ alias: challengeParticipants.alias, correct: sql<number>`coalesce(sum(case when ${challengeAnswers.isCorrect} then 1 else 0 end), 0)`, answered: count(challengeAnswers.id) }).from(challengeParticipants).leftJoin(challengeAnswers, eq(challengeAnswers.participantId, challengeParticipants.id)).where(eq(challengeParticipants.challengeId, challengeId)).groupBy(challengeParticipants.id).orderBy(desc(sql`coalesce(sum(case when ${challengeAnswers.isCorrect} then 1 else 0 end), 0)`), asc(challengeParticipants.alias));
  const challengeQuizRows = await db.select({ question: questions, position: challengeQuestions.position }).from(challengeQuestions).innerJoin(questions, eq(challengeQuestions.questionId, questions.id)).where(eq(challengeQuestions.challengeId, challengeId)).orderBy(asc(challengeQuestions.position));
  const answerCounts = await db.select({ questionId: challengeAnswers.questionId, answerIndex: challengeAnswers.answerIndex, total: count() }).from(challengeAnswers).where(eq(challengeAnswers.challengeId, challengeId)).groupBy(challengeAnswers.questionId, challengeAnswers.answerIndex);
  const countMap = new Map(answerCounts.map((entry) => [`${entry.questionId}-${entry.answerIndex}`, Number(entry.total)]));
  const distribution = challengeQuizRows.map(({ question, position }) => { const options = JSON.parse(question.options) as string[]; const counts = options.map((_, index) => countMap.get(`${question.id}-${index}`) ?? 0); return { question: { ...question, position, options }, counts, total: counts.reduce((sum, value) => sum + value, 0) }; });
  return Response.json({ challenge, totalQuestions: questionCount.total, ranking: ranking.map((entry) => ({ ...entry, correct: Number(entry.correct), answered: Number(entry.answered) })), distribution });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = requireTeacherPin(request);
  if (authError) return authError;
  const { id } = await params; const challengeId = Number(id); const db = getDb();
  await db.delete(challengeAnswers).where(eq(challengeAnswers.challengeId, challengeId));
  await db.delete(challengeParticipants).where(eq(challengeParticipants.challengeId, challengeId));
  return Response.json({ ok: true });
}
