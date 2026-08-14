import { desc, inArray } from "drizzle-orm";
import { getDb } from "../../../db";
import { challengeQuestions, challenges, questions } from "../../../db/schema";

export async function GET() {
  const rows = await getDb().select().from(challenges).orderBy(desc(challenges.id));
  return Response.json({ challenges: rows });
}

export async function POST(request: Request) {
  try {
    const { title, questionIds } = await request.json() as { title?: string; questionIds?: number[] };
    const cleanedTitle = title?.trim() ?? "";
    const ids = [...new Set((questionIds ?? []).map(Number).filter(Number.isInteger))];
    if (!cleanedTitle || ids.length < 2) return Response.json({ error: "Informe um título e ao menos duas questões objetivas." }, { status: 400 });
    const db = getDb(); const selected = await db.select().from(questions).where(inArray(questions.id, ids));
    if (selected.length !== ids.length || selected.some((question) => question.kind !== "choice")) return Response.json({ error: "Selecione somente questões de múltipla escolha disponíveis." }, { status: 400 });
    const [challenge] = await db.insert(challenges).values({ title: cleanedTitle, createdAt: new Date() }).returning();
    await db.insert(challengeQuestions).values(ids.map((questionId, position) => ({ challengeId: challenge.id, questionId, position })));
    return Response.json({ challenge }, { status: 201 });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Não foi possível criar o desafio." }, { status: 500 }); }
}
