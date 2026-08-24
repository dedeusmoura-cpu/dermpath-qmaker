import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { questions, votes } from "../../../../../db/schema";
import { readOrCreateDeviceId, withDeviceIdCookie } from "../../../_lib/device-id";
import { apiError } from "../../../_lib/error-response";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params; const questionId = Number(id);
    const { answerIndex, answerText } = await request.json() as { answerIndex?: number; answerText?: string };
    // The "one vote per device" id comes from a server-issued cookie, not the
    // request body: a client-supplied value could be set to anything on
    // every request, defeating the check entirely.
    const { deviceId, isNew } = readOrCreateDeviceId(request);
    const db = getDb(); const [question] = await db.select().from(questions).where(eq(questions.id, questionId)).limit(1);
    const textAnswer = answerText?.trim().replace(/\s+/g, " ") ?? "";
    const invalidChoice = question?.kind === "choice" && (answerIndex === undefined || answerIndex < 0 || answerIndex >= JSON.parse(question.options).length);
    const invalidText = question?.kind === "open" && (!textAnswer || textAnswer.length > 180) || question?.kind === "cloud" && !textAnswer;
    if (!question || !question.isOpen || invalidChoice || invalidText) return Response.json({ error: "Resposta inválida." }, { status: 400 });
    const prior = await db.select({ id: votes.id }).from(votes).where(and(eq(votes.questionId, questionId), eq(votes.deviceId, deviceId))).limit(1);
    if (prior.length) return withDeviceIdCookie(Response.json({ error: "Este aparelho já respondeu a esta questão." }, { status: 409 }), deviceId, isNew);
    try {
      await db.insert(votes).values({ questionId, answerIndex: question.kind === "choice" ? answerIndex! : 0, answerText: question.kind === "choice" ? null : textAnswer, deviceId, createdAt: new Date() });
    } catch (insertError) {
      // Two concurrent requests from the same device can both pass the
      // `prior` check above; the unique index on (questionId, deviceId)
      // then rejects the second insert. Report it the same way instead of
      // leaking a raw driver error as a 500.
      const message = insertError instanceof Error ? insertError.message : "";
      if (message.toLowerCase().includes("unique")) return withDeviceIdCookie(Response.json({ error: "Este aparelho já respondeu a esta questão." }, { status: 409 }), deviceId, isNew);
      throw insertError;
    }
    return withDeviceIdCookie(Response.json({ ok: true }, { status: 201 }), deviceId, isNew);
  } catch (error) { return apiError(error, "Não foi possível registrar o voto."); }
}
