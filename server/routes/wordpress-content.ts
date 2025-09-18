import type { Request, Response } from "express";

function safeEnv(name: string): string | null {
  const v = process.env[name];
  return v ? String(v) : null;
}

function getBasicAuthHeader(): string | null {
  const user = safeEnv("WP_APP_USER");
  const pass = safeEnv("WP_APP_PASSWORD");
  if (!user || !pass) return null;
  const token = Buffer.from(`${user}:${pass}`).toString("base64");
  return `Basic ${token}`;
}

function getWpBaseUrl(): string | null {
  const url = safeEnv("WP_BASE_URL");
  return url ? url.replace(/\/$/, "") : null;
}

async function proxyWp(
  req: Request,
  res: Response,
  path: string,
  init?: RequestInit,
) {
  const base = getWpBaseUrl();
  if (!base) {
    return res
      .status(400)
      .json({ success: false, error: "WP_BASE_URL not configured" });
  }
  const auth = getBasicAuthHeader();
  const url = `${base}${path}`;
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(init?.headers as any),
  };
  if (auth) headers["Authorization"] = auth;

  try {
    const r = await fetch(url, {
      ...init,
      headers,
      signal: AbortSignal.timeout(8000),
    } as any);
    const text = await r.text();
    const type = r.headers.get("content-type") || "";
    if (!r.ok) {
      return res
        .status(r.status)
        .json({ success: false, error: `WP error ${r.status}`, details: text });
    }
    if (type.includes("application/json")) {
      const json = JSON.parse(text);
      return res.json(json);
    }
    return res.send(text);
  } catch (e: any) {
    return res
      .status(500)
      .json({ success: false, error: e?.message || String(e) });
  }
}

export async function listPages(req: Request, res: Response) {
  const qs = new URLSearchParams();
  const { search, status, per_page, page } = req.query as any;
  if (search) qs.set("search", String(search));
  if (status) qs.set("status", String(status));
  if (per_page) qs.set("per_page", String(per_page));
  if (page) qs.set("page", String(page));
  qs.set("context", "edit");
  qs.set("_fields", "id,slug,status,date,modified,title,excerpt,content,link");
  return proxyWp(req, res, `/wp-json/wp/v2/pages?${qs.toString()}`, {
    method: "GET",
  });
}

export async function getPageById(req: Request, res: Response) {
  const id = req.params.id;
  const qs = new URLSearchParams();
  qs.set("context", "edit");
  return proxyWp(
    req,
    res,
    `/wp-json/wp/v2/pages/${encodeURIComponent(id)}?${qs.toString()}`,
    { method: "GET" },
  );
}

export async function createPage(req: Request, res: Response) {
  const body = req.body || {};
  return proxyWp(req, res, `/wp-json/wp/v2/pages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function updatePage(req: Request, res: Response) {
  const id = req.params.id;
  const body = req.body || {};
  return proxyWp(req, res, `/wp-json/wp/v2/pages/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function listPosts(req: Request, res: Response) {
  const qs = new URLSearchParams();
  const { search, status, per_page, page } = req.query as any;
  if (search) qs.set("search", String(search));
  if (status) qs.set("status", String(status));
  if (per_page) qs.set("per_page", String(per_page));
  if (page) qs.set("page", String(page));
  qs.set("context", "edit");
  qs.set("_fields", "id,slug,status,date,modified,title,excerpt,content,link");
  return proxyWp(req, res, `/wp-json/wp/v2/posts?${qs.toString()}`, {
    method: "GET",
  });
}

export async function getPostById(req: Request, res: Response) {
  const id = req.params.id;
  const qs = new URLSearchParams();
  qs.set("context", "edit");
  return proxyWp(
    req,
    res,
    `/wp-json/wp/v2/posts/${encodeURIComponent(id)}?${qs.toString()}`,
    { method: "GET" },
  );
}

export async function createPost(req: Request, res: Response) {
  const body = req.body || {};
  return proxyWp(req, res, `/wp-json/wp/v2/posts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function updatePost(req: Request, res: Response) {
  const id = req.params.id;
  const body = req.body || {};
  return proxyWp(req, res, `/wp-json/wp/v2/posts/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
