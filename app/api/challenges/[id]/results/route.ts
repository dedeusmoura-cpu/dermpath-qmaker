import { asc, count, desc, eq, sql } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { challengeAnswers, challengeParticipants, challengeQuestions, challenges } from "../../../../../db/schema";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const challengeId = Number(id); const db = getDb();
  const [challenge] = await db.select().from(challenges).where(eq(challenges.id, challengeId)).limit(1);
  if (!challenge) return Response.json({ error: "Desafio não encontrado." }, { status: 404 });
  const [questionCount] = await db.select({ total: count() }).from(challengeQuestions).where(eq(challengeQuestions.challengeId, challengeId));
  const ranking = await db.select({ alias: challengeParticipants.alias, correct: sql<number>`coalesce(sum(case when ${challengeAnswers.isCorrect} then 1 else 0 end), 0)`, answered: count(challengeAnswers.id) }).from(challengeParticipants).leftJoin(challengeAnswers, eq(challengeAnswers.participantId, challengeParticipants.id)).where(eq(challengeParticipants.challengeId, challengeId)).groupBy(challengeParticipants.id).orderBy(desc(sql`coalesce(sum(case when ${challengeAnswers.isCorrect} then 1 else 0 end), 0)`), asc(challengeParticipants.alias));
  return Response.json({ challenge, totalQuestions: questionCount.total, ranking: ranking.map((entry) => ({ ...entry, correct: Number(entry.correct), answered: Number(entry.answered) })) });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const challengeId = Number(id); const db = getDb();
  await db.delete(challengeAnswers).where(eq(challengeAnswers.challengeId, challengeId));
  await db.delete(challengeParticipants).where(eq(challengeParticipants.challengeId, challengeId));
  return Response.json({ ok: true });
}
