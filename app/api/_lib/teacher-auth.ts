import { env } from "cloudflare:workers";

const TEACHER_PIN_HEADER = "x-teacher-pin";

/**
 * Guards teacher-only write actions (reset votes, edit answer keys, reset
 * challenges) behind a shared PIN configured via the `TEACHER_PIN` secret.
 * Returns an error Response to send back immediately, or `null` when the
 * request is authorized and the caller should proceed.
 */
export function requireTeacherPin(request: Request): Response | null {
  const configuredPin = (env as typeof env & { TEACHER_PIN?: string }).TEACHER_PIN;
  if (!configuredPin) {
    return Response.json(
      { error: "TEACHER_PIN não está configurado neste ambiente." },
      { status: 503 },
    );
  }

  const providedPin = request.headers.get(TEACHER_PIN_HEADER) ?? "";
  if (providedPin !== configuredPin) {
    return Response.json(
      { error: "PIN de professor inválido." },
      { status: 401 },
    );
  }

  return null;
}
