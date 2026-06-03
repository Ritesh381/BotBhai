"use client";

import { auth } from "@/lib/firebase/client";

async function authHeaders(): Promise<HeadersInit> {
  const user = auth.currentUser;
  if (!user) return {};
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

async function get(path: string) {
  const res = await fetch(path, { headers: await authHeaders() });
  return res.json();
}

async function post(path: string, body: unknown) {
  const res = await fetch(path, {
    method: "POST",
    headers: { ...(await authHeaders()), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function patch(path: string, body: unknown) {
  const res = await fetch(path, {
    method: "PATCH",
    headers: { ...(await authHeaders()), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function del(path: string) {
  const res = await fetch(path, { method: "DELETE", headers: await authHeaders() });
  return res.json();
}

export const api = { get, post, patch, del };
