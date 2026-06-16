"use client";

import { auth } from "@/lib/firebase/client";

async function authHeaders(): Promise<HeadersInit> {
  const user = auth.currentUser;
  if (!user) return {};
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

// Safely parse a response body. Returns null on empty/non-JSON bodies
// (e.g. a 500 with no body) instead of throwing "Unexpected end of JSON input".
async function parse(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { error: { code: "non_json", message: text.slice(0, 200) } };
  }
}

async function get(path: string): Promise<any> {
  const res = await fetch(path, { headers: await authHeaders() });
  return parse(res);
}

async function post(path: string, body: unknown): Promise<any> {
  const res = await fetch(path, {
    method: "POST",
    headers: { ...(await authHeaders()), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parse(res);
}

async function patch(path: string, body: unknown): Promise<any> {
  const res = await fetch(path, {
    method: "PATCH",
    headers: { ...(await authHeaders()), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parse(res);
}

async function del(path: string): Promise<any> {
  const res = await fetch(path, { method: "DELETE", headers: await authHeaders() });
  return parse(res);
}

export const api = { get, post, patch, del };
