import { desc } from "drizzle-orm";
import { getDb } from "../../../db";
import { questions } from "../../../db/schema";

export async function GET() {
  const rows = await getDb().select().from(questions).orderBy(desc(questions.id));
  return Response.json({ questions: rows.map((q) => ({ ...q, options: JSON.parse(q.options) })) });
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { title?: string; stem?: string; options?: string[]; correctAnswer?: number; imageUrl?: string; kind?: "choice" | "open" };
    const title = body.title?.trim() ?? "";
    const stem = body.stem?.trim() ?? "";
    const options = body.options?.map((option) => option.trim()).filter(Boolean) ?? [];
    const kind = body.kind === "open" ? "open" : "choice";
    const correctAnswer = body.correctAnswer ?? 0;
    if (!title || !stem || (kind === "choice" && (options.length < 2 || options.length > 6 || correctAnswer < 0 || correctAnswer >= options.length))) {
      return Response.json({ error: "Preencha título, enunciado e, nas questões objetivas, alternativas e resposta correta." }, { status: 400 });
    }
    const [question] = await getDb().insert(questions).values({ title, stem, kind, options: JSON.stringify(options), correctAnswer, imageUrl: body.imageUrl?.trim() || null, createdAt: new Date() }).returning();
    return Response.json({ question: { ...question, options } }, { status: 201 });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Não foi possível criar a questão." }, { status: 500 }); }
}
