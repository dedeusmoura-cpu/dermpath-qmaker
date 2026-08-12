import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { questions } from "../../../../db/schema";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [question] = await getDb().select().from(questions).where(eq(questions.id, Number(id))).limit(1);
  if (!question) return Response.json({ error: "Questão não encontrada." }, { status: 404 });
  return Response.json({ question: { ...question, options: JSON.parse(question.options) } });
}
