import type { User } from "../types";

const API_BASE = "/api";

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  currentUser: User | null = null
): Promise<T> {
  const headers = new Headers(options.headers);

  headers.set("Content-Type", "application/json");

  if (currentUser) {
    headers.set("x-user-id", String(currentUser.id));
    headers.set("x-user-role", currentUser.role);
    headers.set("x-user-name", currentUser.name);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(errorBody?.error || "Request failed");
  }

  if (response.status === 204) {
    return null as T;
  }

  return response.json();
}