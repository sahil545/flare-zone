import type { Request, Response } from "express";
import { getSiteTz, getSiteTzSource } from "../config/siteTz";
import { toUtcMs } from "../lib/time";

export async function assignmentAudit(req: Request, res: Response) {
  try {
    const base = process.env.WP_BASE_URL || process.env.WP_URL;
    if (!base) return res.status(400).json({ success: false, error: "WP_BASE_URL not set" });
    const id = String(req.query.booking_id || "").trim();
    if (!id) return res.status(400).json({ success: false, error: "booking_id is required" });

    const url = `${base.replace(/\/$/, "")}/wp-json/wp/v2/wc_booking/${encodeURIComponent(id)}?context=edit`;
    const basic = process.env.WP_APP_USER && process.env.WP_APP_PASSWORD
      ? `Basic ${Buffer.from(`${process.env.WP_APP_USER}:${process.env.WP_APP_PASSWORD}`).toString("base64")}`
      : "";
    const r = await fetch(url, { headers: { Accept: "application/json", Authorization: basic }, signal: AbortSignal.timeout(4000) } as any);
    const text = await r.text();
    const json = (() => { try { return JSON.parse(text); } catch { return null; } })();
    return res.status(r.ok ? 200 : r.status).json({ success: r.ok, status: r.status, url, raw: text, json });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e?.message || String(e) });
  }
}

export async function siteTzInfo(req: Request, res: Response) {
  try {
    const tz = await getSiteTz();
    return res.json({ success: true, ...(getSiteTzSource()), resolved: tz });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e?.message || String(e) });
  }
}

export async function timeAudit(req: Request, res: Response) {
  try {
    const id = String(req.query.id || "");
    const siteTz = await getSiteTz();
    // This demo uses the WooCommerce route to fetch all, then pick one by id
    // In a real impl, fetch one by id for performance
    const base = process.env.WOOCOMMERCE_STORE_URL;
    if (!base) return res.status(400).json({ success: false, error: "WOOCOMMERCE_STORE_URL not set" });
    const url = `${base.replace(/\/$/, "")}/wp-json/wc-bookings/v1/bookings?per_page=20`;
    const r = await fetch(url, { headers: { Accept: "application/json" } } as any);
    const arr: any[] = r.ok ? await r.json() : [];
    const raw = arr.find((x) => String(x?.id) === id) || arr[0] || null;
    if (!raw) return res.json({ success: true, siteTz, message: "no sample" });

    const startMs = toUtcMs(raw.start ?? raw.booking_start ?? raw._booking_start, siteTz);
    const endMs = toUtcMs(raw.end ?? raw.booking_end ?? raw._booking_end, siteTz);

    return res.json({
      success: true,
      siteTz,
      raw: { start: raw.start, booking_start: raw.booking_start, _booking_start: raw._booking_start, end: raw.end, booking_end: raw.booking_end, _booking_end: raw._booking_end },
      parsed: {
        startMs,
        endMs,
        startIsoUtc: startMs ? new Date(startMs).toISOString() : null,
        endIsoUtc: endMs ? new Date(endMs).toISOString() : null,
      },
    });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e?.message || String(e) });
  }
}
