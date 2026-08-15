import { eq, sql } from "drizzle-orm";
import { getDb } from "../../../../db";
import { challengeAnswers, questions } from "../../../../db/schema";
import { requireTeacherPin } from "../../_lib/teacher-auth";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [question] = await getDb().select().from(questions).where(eq(questions.id, Number(id))).limit(1);
  if (!question) return Response.json({ error: "Questão não encontrada." }, { status: 404 });
  return Response.json({ question: { ...question, options: JSON.parse(question.options) } });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = requireTeacherPin(request);
  if (authError) return authError;
  const { id } = await params;
  const questionId = Number(id);
  const db = getDb();
  const [question] = await db.select().from(questions).where(eq(questions.id, questionId)).limit(1);
  if (!question) return Response.json({ error: "Questão não encontrada." }, { status: 404 });

  const body = await request.json() as { correctAnswer?: unknown };
  const correctAnswer = Number(body.correctAnswer);
  const options = JSON.parse(question.options) as string[];
  if (question.kind !== "choice" || !Number.isInteger(correctAnswer) || correctAnswer < 0 || correctAnswer >= options.length) {
    return Response.json({ error: "Gabarito inválido para esta questão." }, { status: 400 });
  }

  await db.update(questions).set({ correctAnswer }).where(eq(questions.id, questionId));
  await db.update(challengeAnswers).set({ isCorrect: sql`case when ${challengeAnswers.answerIndex} = ${correctAnswer} then 1 else 0 end` }).where(eq(challengeAnswers.questionId, questionId));

  return Response.json({ question: { ...question, correctAnswer, options } });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = requireTeacherPin(request);
  if (authError) return authError;
  const { id } = await params;
  const questionId = Number(id);
  const db = getDb();
  const [question] = await db.select({ id: questions.id }).from(questions).where(eq(questions.id, questionId)).limit(1);
  if (!question) return Response.json({ error: "Questão não encontrada." }, { status: 404 });
  // Votes, trophy-challenge slots, and trophy-challenge answers for this
  // question all cascade on delete (db/schema.ts references), so removing
  // the question cleans those up too.
  await db.delete(questions).where(eq(questions.id, questionId));
  return Response.json({ ok: true });
}
