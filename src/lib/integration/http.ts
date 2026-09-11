import type { ApiErrorCode } from "./contracts";

export function requestId(request: Request) {
  const incoming = request.headers.get("x-request-id")?.trim();
  return incoming && /^[A-Za-z0-9._:-]{8,80}$/.test(incoming)
    ? incoming
    : crypto.randomUUID();
}

function headers(id: string, extra?: HeadersInit) {
  return {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "X-Request-Id": id,
    ...extra,
  };
}

export function apiSuccess(id: string, data: unknown, status = 200) {
  return new Response(JSON.stringify({ data, request_id: id }), {
    status,
    headers: headers(id),
  });
}

export function apiError(
  id: string,
  status: number,
  code: ApiErrorCode,
  message: string,
  extraHeaders?: HeadersInit,
) {
  return new Response(JSON.stringify({ error: { code, message, request_id: id } }), {
    status,
    headers: headers(id, extraHeaders),
  });
}

export async function readJson(request: Request): Promise<unknown> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new Error("Content-Type must be application/json");
  }
  return request.json();
}