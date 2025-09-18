import { getToken } from "@/lib/auth";
import type { WpPost, WpPage, UpsertPostPayload } from "../../shared/wp";

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (init?.headers) Object.assign(headers, init.headers as any);
  const res = await fetch(url, { ...init, headers });
  const text = await res.text();
  if (!res.ok) throw new Error(text || `Request failed: ${res.status}`);
  return text ? (JSON.parse(text) as T) : ({} as T);
}

export const cms = {
  // Pages
  listPages: (params?: {
    search?: string;
    status?: string;
    page?: number;
    per_page?: number;
  }) => {
    const qs = new URLSearchParams();
    if (params?.search) qs.set("search", params.search);
    if (params?.status) qs.set("status", params.status);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.per_page) qs.set("per_page", String(params.per_page));
    const q = qs.toString();
    return api<WpPage[]>(`/api/wp/pages${q ? `?${q}` : ""}`);
  },
  getPage: (id: number | string) => api<WpPage>(`/api/wp/pages/${id}`),
  createPage: (payload: UpsertPostPayload) =>
    api<WpPage>(`/api/wp/pages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  updatePage: (id: number | string, payload: UpsertPostPayload) =>
    api<WpPage>(`/api/wp/pages/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  // Posts
  listPosts: (params?: {
    search?: string;
    status?: string;
    page?: number;
    per_page?: number;
  }) => {
    const qs = new URLSearchParams();
    if (params?.search) qs.set("search", params.search);
    if (params?.status) qs.set("status", params.status);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.per_page) qs.set("per_page", String(params.per_page));
    const q = qs.toString();
    return api<WpPost[]>(`/api/wp/posts${q ? `?${q}` : ""}`);
  },
  getPost: (id: number | string) => api<WpPost>(`/api/wp/posts/${id}`),
  createPost: (payload: UpsertPostPayload) =>
    api<WpPost>(`/api/wp/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  updatePost: (id: number | string, payload: UpsertPostPayload) =>
    api<WpPost>(`/api/wp/posts/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
};
