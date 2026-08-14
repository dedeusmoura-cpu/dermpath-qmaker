import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { questions, votes } from "../../../../../db/schema";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params; const questionId = Number(id);
    const { answerIndex, answerText, deviceId } = await request.json() as { answerIndex?: number; answerText?: string; deviceId?: string };
    const db = getDb(); const [question] = await db.select().from(questions).where(eq(questions.id, questionId)).limit(1);
    const textAnswer = answerText?.trim().replace(/\s+/g, " ") ?? "";
    const invalidChoice = question?.kind === "choice" && (answerIndex === undefined || answerIndex < 0 || answerIndex >= JSON.parse(question.options).length);
    const invalidText = question?.kind === "open" && (!textAnswer || textAnswer.length > 180) || question?.kind === "cloud" && (!textAnswer || textAnswer.length > 25);
    if (!question || !question.isOpen || !deviceId || invalidChoice || invalidText) return Response.json({ error: "Resposta inválida." }, { status: 400 });
    const prior = await db.select({ id: votes.id }).from(votes).where(and(eq(votes.questionId, questionId), eq(votes.deviceId, deviceId))).limit(1);
    if (prior.length) return Response.json({ error: "Este aparelho já respondeu a esta questão." }, { status: 409 });
    await db.insert(votes).values({ questionId, answerIndex: question.kind === "choice" ? answerIndex! : 0, answerText: question.kind === "choice" ? null : textAnswer, deviceId, createdAt: new Date() });
    return Response.json({ ok: true }, { status: 201 });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Não foi possível registrar o voto." }, { status: 500 }); }
}
