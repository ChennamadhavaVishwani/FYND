import { supabase } from "../lib/supabase";

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
export const BASE_URL = rawBaseUrl.replace(/\/+$/, "");

export async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    "Content-Type": "application/json",
    ...(session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : {}),
  };
}

function buildUrl(path, params = {}) {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null)
  ).toString();
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${BASE_URL}${cleanPath}${query ? `?${query}` : ""}`;
}

export async function apiGet(path, params = {}) {
  const url = buildUrl(path, params);
  const headers = await getAuthHeaders();
  const res = await fetch(url, { headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed: ${res.status}`);
  }
  return res.json();
}

export async function apiPost(path, params = {}, body = undefined) {
  const url = buildUrl(path, params);
  const headers = await getAuthHeaders();
  const res = await fetch(url, {
    method: "POST",
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.detail || `Request failed: ${res.status}`);
  }
  return res.json();
}

export async function apiPut(path, params = {}, body = undefined) {
  const url = buildUrl(path, params);
  const headers = await getAuthHeaders();
  const res = await fetch(url, {
    method: "PUT",
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.detail || `Request failed: ${res.status}`);
  }
  return res.json();
}

export async function apiDelete(path, params = {}) {
  const url = buildUrl(path, params);
  const headers = await getAuthHeaders();
  const res = await fetch(url, {
    method: "DELETE",
    headers,
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.detail || `Request failed: ${res.status}`);
  }
  return res.json();
}