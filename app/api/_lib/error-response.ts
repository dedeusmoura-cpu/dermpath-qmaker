/**
 * Standard error response for API route catch-alls. Logs the real error
 * server-side (visible in `wrangler tail`/dev logs) but never forwards the
 * raw driver/exception message to the client, which can include internal
 * details like table or column names.
 */
export function apiError(error: unknown, fallbackMessage: string, status = 500): Response {
  console.error(error);
  return Response.json({ error: fallbackMessage }, { status });
}
