import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { challengeParticipants, challenges } from "../../../../../db/schema";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params; const challengeId = Number(id); const { alias, token } = await request.json() as { alias?: string; token?: string }; const db = getDb();
    const [challenge] = await db.select({ id: challenges.id }).from(challenges).where(eq(challenges.id, challengeId)).limit(1);
    if (!challenge) return Response.json({ error: "Desafio não encontrado." }, { status: 404 });
    if (token) { const [participant] = await db.select().from(challengeParticipants).where(and(eq(challengeParticipants.challengeId, challengeId), eq(challengeParticipants.token, token))).limit(1); if (participant) return Response.json({ participant }); }
    const cleanedAlias = alias?.trim().replace(/\s+/g, " ") ?? "";
    if (!cleanedAlias || cleanedAlias.length > 40) return Response.json({ error: "Digite seu nome (até 40 caracteres)." }, { status: 400 });
    const [participant] = await db.insert(challengeParticipants).values({ challengeId, alias: cleanedAlias, token: crypto.randomUUID(), createdAt: new Date() }).returning();
    return Response.json({ participant }, { status: 201 });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Não foi possível entrar no desafio." }, { status: 500 }); }
}
