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

// Supports two shapes from the same endpoint:
//  - `{ correctAnswer }` only — the answer-key dropdown in the trophy
//    challenge panel, which must keep working on "choice" questions.
//  - A fuller edit (`title`/`stem`/`options`/`imageUrl`/`correctAnswer`) from
//    the "edit quiz" form. Any field left out keeps its current value.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = requireTeacherPin(request);
  if (authError) return authError;
  const { id } = await params;
  const questionId = Number(id);
  const db = getDb();
  const [question] = await db.select().from(questions).where(eq(questions.id, questionId)).limit(1);
  if (!question) return Response.json({ error: "Questão não encontrada." }, { status: 404 });

  const body = await request.json() as { title?: string; stem?: string; options?: string[]; correctAnswer?: unknown; imageUrl?: string };
  const currentOptions = JSON.parse(question.options) as string[];

  const title = body.title !== undefined ? body.title.trim() : question.title;
  const stem = body.stem !== undefined ? body.stem.trim() : question.stem;
  const options = body.options !== undefined ? body.options.map((option) => option.trim()).filter(Boolean) : currentOptions;
  const imageUrl = body.imageUrl !== undefined ? (body.imageUrl.trim() || null) : question.imageUrl;
  const correctAnswer = body.correctAnswer !== undefined ? Number(body.correctAnswer) : question.correctAnswer;

  const invalidChoice = question.kind === "choice" && (options.length < 2 || options.length > 6 || !Number.isInteger(correctAnswer) || correctAnswer < 0 || correctAnswer >= options.length);
  if (!title || !stem || invalidChoice) {
    return Response.json({ error: "Preencha título, enunciado e, nas questões objetivas, alternativas e resposta correta." }, { status: 400 });
  }

  await db.update(questions).set({ title, stem, options: JSON.stringify(options), correctAnswer, imageUrl }).where(eq(questions.id, questionId));
  if (question.kind === "choice") await db.update(challengeAnswers).set({ isCorrect: sql`case when ${challengeAnswers.answerIndex} = ${correctAnswer} then 1 else 0 end` }).where(eq(challengeAnswers.questionId, questionId));

  return Response.json({ question: { ...question, title, stem, correctAnswer, imageUrl, options } });
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
