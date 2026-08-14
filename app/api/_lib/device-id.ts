const DEVICE_COOKIE = "qmaker-device";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/**
 * Identifies the calling browser for the "one vote per device" rule using a
 * server-issued cookie instead of trusting a client-supplied id, which any
 * caller could set to an arbitrary value on every request.
 *
 * Returns the existing id from the request's cookie, or a freshly minted one
 * that must be attached to the response via `withDeviceIdCookie`.
 */
export function readOrCreateDeviceId(request: Request): { deviceId: string; isNew: boolean } {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${DEVICE_COOKIE}=([^;]+)`));
  if (match) return { deviceId: decodeURIComponent(match[1]), isNew: false };
  return { deviceId: crypto.randomUUID(), isNew: true };
}

export function withDeviceIdCookie(response: Response, deviceId: string, isNew: boolean): Response {
  if (!isNew) return response;
  response.headers.append(
    "Set-Cookie",
    `${DEVICE_COOKIE}=${encodeURIComponent(deviceId)}; Path=/; Max-Age=${ONE_YEAR_SECONDS}; SameSite=Lax; HttpOnly`,
  );
  return response;
}
