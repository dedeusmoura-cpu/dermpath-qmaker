import { asc, eq, inArray } from "drizzle-orm";
import { getDb } from "../../../../db";
import { challengeQuestions, challenges, questions } from "../../../../db/schema";
import { apiError } from "../../_lib/error-response";
import { requireTeacherPin } from "../../_lib/teacher-auth";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const challengeId = Number(id); const db = getDb();
  const [challenge] = await db.select().from(challenges).where(eq(challenges.id, challengeId)).limit(1);
  if (!challenge) return Response.json({ error: "Desafio não encontrado." }, { status: 404 });
  const rows = await db.select({ question: questions, position: challengeQuestions.position }).from(challengeQuestions).innerJoin(questions, eq(challengeQuestions.questionId, questions.id)).where(eq(challengeQuestions.challengeId, challengeId)).orderBy(asc(challengeQuestions.position));
  return Response.json({ challenge: { ...challenge, questions: rows.map(({ question, position }) => ({ ...question, position, options: JSON.parse(question.options) })) } });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = requireTeacherPin(request);
  if (authError) return authError;
  try {
    const { id } = await params; const challengeId = Number(id); const db = getDb();
    const [challenge] = await db.select({ id: challenges.id }).from(challenges).where(eq(challenges.id, challengeId)).limit(1);
    if (!challenge) return Response.json({ error: "Desafio não encontrado." }, { status: 404 });

    const { title, questionIds } = await request.json() as { title?: string; questionIds?: number[] };
    const cleanedTitle = title?.trim() ?? "";
    const ids = [...new Set((questionIds ?? []).map(Number).filter(Number.isInteger))];
    if (!cleanedTitle || ids.length < 2) return Response.json({ error: "Informe um título e ao menos duas questões objetivas." }, { status: 400 });
    const selected = await db.select().from(questions).where(inArray(questions.id, ids));
    if (selected.length !== ids.length || selected.some((question) => question.kind !== "choice")) return Response.json({ error: "Selecione somente questões de múltipla escolha disponíveis." }, { status: 400 });

    await db.update(challenges).set({ title: cleanedTitle }).where(eq(challenges.id, challengeId));
    // Replace the challenge's quiz slots wholesale. challengeAnswers references
    // (challengeId, questionId) but not challengeQuestions directly, so
    // existing player answers for quizzes that remain in the challenge are
    // preserved; answers for a removed quiz are simply orphaned from the
    // slot list (still counted in the panel's per-quiz distribution by id).
    await db.delete(challengeQuestions).where(eq(challengeQuestions.challengeId, challengeId));
    await db.insert(challengeQuestions).values(ids.map((questionId, position) => ({ challengeId, questionId, position })));

    return Response.json({ challenge: { id: challengeId, title: cleanedTitle } });
  } catch (error) { return apiError(error, "Não foi possível salvar o desafio."); }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = requireTeacherPin(request);
  if (authError) return authError;
  const { id } = await params; const challengeId = Number(id); const db = getDb();
  const [challenge] = await db.select({ id: challenges.id }).from(challenges).where(eq(challenges.id, challengeId)).limit(1);
  if (!challenge) return Response.json({ error: "Desafio não encontrado." }, { status: 404 });
  // challenge_questions, challenge_participants, and challenge_answers all
  // cascade on delete (db/schema.ts references), so this cleans up
  // everything tied to the challenge.
  await db.delete(challenges).where(eq(challenges.id, challengeId));
  return Response.json({ ok: true });
}
