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

function toSafeUser(data: any) {
  return {
    id: data.id,
    name: data.name || data.username,
    username: data.slug || data.username,
    email: data.email || null,
    roles: Array.isArray(data.roles) ? data.roles : [],
    avatar: data.avatar_urls
      ? (Object.values(data.avatar_urls as any)[0] as string)
      : undefined,
    nickname: data.nickname || null,
    first_name: data.first_name || null,
    last_name: data.last_name || null,
  };
}

export async function wpGetMe(req: Request, res: Response) {
  try {
    const base = getWpBaseUrl();
    if (!base) {
      return res.status(400).json({ success: false, error: "WP_BASE_URL not configured" });
    }
    const incomingAuth = req.get("authorization");
    const useBearer =
      incomingAuth && incomingAuth.toLowerCase().startsWith("bearer ");
    const authHeader = useBearer ? incomingAuth! : getBasicAuthHeader();
    const url = `${base}/wp-json/wp/v2/users/me?context=edit`;
    const r = await fetch(url, {
      headers: {
        ...(authHeader ? { Authorization: authHeader } : {}),
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(4000),
    } as any);
    const text = await r.text();
    if (!r.ok) {
      return res
        .status(r.status)
        .json({ success: false, error: `WP error ${r.status}`, details: text });
    }
    const data = JSON.parse(text);
    return res.json({ success: true, data: toSafeUser(data) });
  } catch (e: any) {
    return res
      .status(500)
      .json({ success: false, error: e?.message || String(e) });
  }
}

export async function wpFindUser(req: Request, res: Response) {
  try {
    const base = getWpBaseUrl();
    if (!base) {
      return res.status(400).json({ success: false, error: "WP_BASE_URL not configured" });
    }
    const auth = getBasicAuthHeader();
    const idQ = req.query.id ? String(req.query.id).trim() : "";
    const userQ = req.query.username ? String(req.query.username).trim() : "";
    const emailQ = req.query.email ? String(req.query.email).trim() : "";

    if (!idQ && !userQ && !emailQ) {
      return res.status(400).json({
        success: false,
        error: "Provide one of id, username, or email",
      });
    }

    const search = idQ || userQ || emailQ;
    const url = `${base}/wp-json/wp/v2/users?per_page=100&search=${encodeURIComponent(search)}&context=edit`;
    const r = await fetch(url, {
      headers: { ...(auth ? { Authorization: auth } : {}), Accept: "application/json" },
      signal: AbortSignal.timeout(4000),
    } as any);
    const text = await r.text();
    if (!r.ok) {
      return res
        .status(r.status)
        .json({ success: false, error: `WP error ${r.status}`, details: text });
    }
    const arr = JSON.parse(text);
    if (!Array.isArray(arr)) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    let match: any = null;
    for (const u of arr) {
      if (idQ && String(u.id) === idQ) {
        match = u;
        break;
      }
      if (
        userQ &&
        (u.slug === userQ || u.username === userQ || u.name === userQ)
      ) {
        match = u;
        break;
      }
      if (emailQ && u.email === emailQ) {
        match = u;
        break;
      }
    }
    if (!match && arr.length > 0) {
      match = arr[0];
    }

    if (!match) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    return res.json({ success: true, data: toSafeUser(match) });
  } catch (e: any) {
    return res
      .status(500)
      .json({ success: false, error: e?.message || String(e) });
  }
}

export async function wpJwtLogin(req: Request, res: Response) {
  try {
    const base = getWpBaseUrl();
    if (!base) {
      return res.status(400).json({ success: false, error: "WP_BASE_URL not configured" });
    }
    const { username, password } = (req.body || {}) as {
      username?: string;
      password?: string;
    };
    if (!username || !password) {
      return res
        .status(400)
        .json({ success: false, error: "username and password are required" });
    }

    const url = `${base}/wp-json/jwt-auth/v1/token`;
    const r = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ username, password }),
      signal: AbortSignal.timeout(4000),
    } as any);
    const text = await r.text();
    if (!r.ok) {
      return res
        .status(r.status)
        .json({ success: false, error: `WP error ${r.status}`, details: text });
    }
    const data = JSON.parse(text);
    return res.json({ success: true, data });
  } catch (e: any) {
    return res
      .status(500)
      .json({ success: false, error: e?.message || String(e) });
  }
}

export async function wpAssignedBookings(req: Request, res: Response) {
  try {
    const base = getWpBaseUrl();
    if (!base) {
      return res.status(400).json({ success: false, error: "WP_BASE_URL not configured" });
    }
    const incomingAuth = req.get("authorization");
    const useBearer = !!(incomingAuth && incomingAuth.toLowerCase().startsWith("bearer "));

    const { start_date, end_date } = req.query as any;
    let instructorId: string | null = (req.query as any).instructor_id ? String((req.query as any).instructor_id) : null;

    // If no explicit instructor provided, resolve from JWT (Bearer) token.
    if (!instructorId) {
      if (useBearer) {
        try {
          const meUrl = `${base}/wp-json/wp/v2/users/me?context=edit`;
          const meRes = await fetch(meUrl, {
            headers: { Authorization: incomingAuth!, Accept: "application/json" },
            signal: AbortSignal.timeout(4000),
          } as any);
          if (meRes.ok) {
            const meText = await meRes.text();
            const me = JSON.parse(meText);
            if (me?.id) instructorId = String(me.id);
          }
        } catch {}
      }
      if (!instructorId) {
        return res.status(401).json({ success: false, error: "Missing instructor_id. Provide instructor_id or authenticate with Bearer JWT." });
      }
    }

    const params = new URLSearchParams();
    params.set("instructor_id", instructorId);
    if (start_date) params.set("start", String(start_date));
    if (end_date) {
      const endStr = String(end_date);
      const inclusive = /^(\d{4}-\d{2}-\d{2})$/.test(endStr) ? `${endStr} 23:59:59` : endStr;
      params.set("end", inclusive);
    }

    const url = `${base}/wp-json/klsd/v1/assigned-bookings?${params.toString()}`;

    // Choose auth: prefer Bearer if present, otherwise Basic service account
    const basic = getBasicAuthHeader();
    const primaryAuth = useBearer ? incomingAuth! : basic || "";

    // First try with primary auth
    let r = await fetch(url, {
      headers: { Authorization: primaryAuth, Accept: "application/json" },
      signal: AbortSignal.timeout(4000),
    } as any);

    // If unauthorized with Bearer, try Basic fallback (still using explicit instructor_id)
    if ((r.status === 401 || r.status === 403) && useBearer) {
      try {
        const basic = getBasicAuthHeader();
        const r2 = await fetch(url, {
          headers: { Authorization: (basic || ""), Accept: "application/json" },
          signal: AbortSignal.timeout(4000),
        } as any);
        if (r2.ok) {
          const text2 = await r2.text();
          const data2 = JSON.parse(text2);
          return res.json(data2);
        }
        r = r2;
      } catch {}
    }

    const text = await r.text();
    if (!r.ok) {
      return res.status(r.status).json({ success: false, error: `WP error ${r.status}`, details: text });
    }
    let data = JSON.parse(text);

    // Fallback: if empty with a date range, retry without dates (still with instructor) and filter here
    try {
      const hasRange = !!(start_date || end_date);
      const list = Array.isArray(data?.data) ? data.data : [];
      if (hasRange && list.length === 0) {
        const url2 = `${base}/wp-json/klsd/v1/assigned-bookings?instructor_id=${encodeURIComponent(instructorId)}`;
        let r2 = await fetch(url2, {
          headers: {
            Authorization: primaryAuth,
            Accept: "application/json",
            "Cache-Control": "no-cache",
          },
          signal: AbortSignal.timeout(4000),
        } as any);
        if ((r2.status === 401 || r2.status === 403) && useBearer) {
          try {
            const basic = getBasicAuthHeader();
            r2 = await fetch(url2, {
              headers: {
                Authorization: (basic || ""),
                Accept: "application/json",
                "Cache-Control": "no-cache",
              },
              signal: AbortSignal.timeout(4000),
            } as any);
          } catch {}
        }
        if (r2.ok) {
          const t2 = await r2.text();
          const j2 = JSON.parse(t2);
          const arr: any[] = Array.isArray(j2?.data) ? j2.data : [];
          const minMs = start_date ? Date.parse(String(start_date) + (String(start_date).length === 10 ? " 00:00:00" : "")) : -Infinity;
          const maxMs = end_date ? Date.parse(String(end_date) + (String(end_date).length === 10 ? " 23:59:59" : "")) : Infinity;
          const filtered = arr.filter((b: any) => {
            const s = typeof b?.start === "number" ? (b.start > 1e12 ? b.start : b.start * 1000) : Date.parse(String(b?.start));
            return Number.isFinite(s) && s >= minMs && s <= maxMs;
          });
          data = { success: true, data: filtered, total: filtered.length };
        }
      }
    } catch {}

    return res.json(data);
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e?.message || String(e) });
  }
}
