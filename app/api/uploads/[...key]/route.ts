import { env } from "cloudflare:workers";

type StoredImage = { body: ReadableStream; httpMetadata?: { contentType?: string } };
type ImageBucket = { get: (key: string) => Promise<StoredImage | null> };

export async function GET(_request: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const bucket = (env as typeof env & { UPLOADS?: ImageBucket }).UPLOADS;
  if (!bucket) return new Response("Image storage is unavailable", { status: 503 });
  const { key } = await params;
  const image = await bucket.get(key.join("/"));
  if (!image) return new Response("Image not found", { status: 404 });
  return new Response(image.body, { headers: { "Content-Type": image.httpMetadata?.contentType ?? "application/octet-stream", "Cache-Control": "public, max-age=31536000, immutable" } });
}
