import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { challengeAnswers, challengeParticipants, challengeQuestions, questions } from "../../../../../db/schema";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params; const challengeId = Number(id); const { token, questionId, answerIndex } = await request.json() as { token?: string; questionId?: number; answerIndex?: number }; const db = getDb();
    const [participant] = await db.select().from(challengeParticipants).where(and(eq(challengeParticipants.challengeId, challengeId), eq(challengeParticipants.token, token ?? ""))).limit(1);
    const rows = await db.select({ question: questions }).from(challengeQuestions).innerJoin(questions, eq(challengeQuestions.questionId, questions.id)).where(and(eq(challengeQuestions.challengeId, challengeId), eq(challengeQuestions.questionId, Number(questionId)))).limit(1);
    const question = rows[0]?.question;
    if (!participant || !question || answerIndex === undefined || answerIndex < 0 || answerIndex >= JSON.parse(question.options).length) return Response.json({ error: "Resposta inválida." }, { status: 400 });
    const [previous] = await db.select({ id: challengeAnswers.id }).from(challengeAnswers).where(and(eq(challengeAnswers.participantId, participant.id), eq(challengeAnswers.questionId, question.id))).limit(1);
    if (previous) return Response.json({ error: "Você já respondeu a esta questão." }, { status: 409 });
    const isCorrect = answerIndex === question.correctAnswer;
    await db.insert(challengeAnswers).values({ challengeId, questionId: question.id, participantId: participant.id, answerIndex, isCorrect, createdAt: new Date() });
    return Response.json({ ok: true, isCorrect }, { status: 201 });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Não foi possível registrar a resposta." }, { status: 500 }); }
}
