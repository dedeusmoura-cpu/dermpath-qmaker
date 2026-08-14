import { env } from "cloudflare:workers";

type ImageBucket = {
  put: (key: string, value: ArrayBuffer, options: { httpMetadata: { contentType: string } }) => Promise<unknown>;
};

export async function POST(request: Request) {
  const bucket = (env as typeof env & { UPLOADS?: ImageBucket }).UPLOADS;
  if (!bucket) return Response.json({ error: "O armazenamento de imagens não está disponível." }, { status: 503 });

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File) || !file.type.startsWith("image/")) return Response.json({ error: "Envie um arquivo de imagem válido." }, { status: 400 });
  if (file.size > 8 * 1024 * 1024) return Response.json({ error: "A imagem deve ter no máximo 8 MB." }, { status: 400 });

  const extension = file.type.split("/")[1]?.replace(/[^a-z0-9]/gi, "") || "image";
  const key = `questions/${crypto.randomUUID()}.${extension}`;
  await bucket.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } });
  return Response.json({ url: `/api/uploads/${key}` }, { status: 201 });
}
