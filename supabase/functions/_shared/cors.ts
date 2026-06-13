/**
 * CORS 头统一处理 — 云深飞运 Edge Functions
 */
export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-type",
  "Access-Control-Max-Age": "86400",
};

export function handleCors(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  return null;
}

export function withCors(init?: ResponseInit): ResponseInit {
  return {
    ...init,
    headers: { ...(init?.headers ? Object.fromEntries(new Headers(init.headers)) : {}), ...CORS_HEADERS },
  };
}
