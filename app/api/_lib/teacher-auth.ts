import { env } from "cloudflare:workers";

const TEACHER_PIN_HEADER = "x-teacher-pin";

/**
 * The Sites platform injects custom environment values (configured under
 * Site Settings) into `process.env`, unlike the D1/R2 bindings declared in
 * .openai/hosting.json, which arrive through the Workers `env` binding. Local
 * dev via `.dev.vars` populates `env` instead, so check both.
 */
function getConfiguredPin(): string | undefined {
  return process.env.TEACHER_PIN || (env as typeof env & { TEACHER_PIN?: string }).TEACHER_PIN;
}

/**
 * Guards teacher-only write actions (reset votes, edit answer keys, reset
 * challenges) behind a shared PIN configured via the `TEACHER_PIN` secret.
 * Returns an error Response to send back immediately, or `null` when the
 * request is authorized and the caller should proceed.
 */
export function requireTeacherPin(request: Request): Response | null {
  const configuredPin = getConfiguredPin();
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
