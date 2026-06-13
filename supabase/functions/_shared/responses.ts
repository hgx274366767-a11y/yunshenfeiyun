/**
 * 统一响应工具 — 自动附加 CORS 头
 */
import { CORS_HEADERS } from "./cors.ts";

export function json(status: number, body: object): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

export function ok<T = any>(data: T): Response {
  return json(200, { success: true, data });
}

export function created<T = any>(data: T): Response {
  return json(201, { success: true, data });
}

export function badRequest(code: string, message: string): Response {
  return json(400, { success: false, error: { code, message } });
}

export function forbidden(message = "权限不足"): Response {
  return json(403, { success: false, error: { code: "FORBIDDEN", message } });
}

export function notFound(message = "资源不存在"): Response {
  return json(404, { success: false, error: { code: "NOT_FOUND", message } });
}

export function conflict(code: string, message: string): Response {
  return json(409, { success: false, error: { code, message } });
}

export function serverError(err: Error | string, code = "INTERNAL_ERROR"): Response {
  const message = typeof err === "string" ? err : err.message;
  return json(500, { success: false, error: { code, message } });
}
