import { desc } from "drizzle-orm";
import { getDb } from "../../../db";
import { questions } from "../../../db/schema";

export async function GET() {
  const rows = await getDb().select().from(questions).orderBy(desc(questions.id));
  return Response.json({ questions: rows.map((q) => ({ ...q, options: JSON.parse(q.options) })) });
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { title?: string; stem?: string; options?: string[]; correctAnswer?: number };
    const title = body.title?.trim() ?? "";
    const stem = body.stem?.trim() ?? "";
    const options = body.options?.map((option) => option.trim()).filter(Boolean) ?? [];
    const correctAnswer = body.correctAnswer;
    if (!title || !stem || options.length < 2 || options.length > 6 || correctAnswer === undefined || correctAnswer < 0 || correctAnswer >= options.length) {
      return Response.json({ error: "Preencha título, enunciado, alternativas e resposta correta." }, { status: 400 });
    }
    const [question] = await getDb().insert(questions).values({ title, stem, options: JSON.stringify(options), correctAnswer, createdAt: new Date() }).returning();
    return Response.json({ question: { ...question, options } }, { status: 201 });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Não foi possível criar a questão." }, { status: 500 }); }
}
