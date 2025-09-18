let SITE_TZ: string | null = null;
let LAST_SOURCE: string | null = null;

async function tryFetchJson(url: string, headers: any = {}) {
  try {
    const r = await fetch(url, { headers: { Accept: "application/json", ...headers }, signal: AbortSignal.timeout(4000) } as any);
    if (!r.ok) return null;
    return await r.json().catch(() => null as any);
  } catch {
    return null;
  }
}

function norm(base?: string | null) {
  return (base || "").replace(/\/$/, "");
}

export async function getSiteTz(): Promise<string> {
  if (process.env.FORCE_SITE_TZ) {
    SITE_TZ = process.env.FORCE_SITE_TZ;
    LAST_SOURCE = "env:FORCE_SITE_TZ";
    return SITE_TZ;
  }
  if (SITE_TZ) return SITE_TZ;

  // 1) WordPress plugin endpoint (preferred)
  for (const base of [process.env.WP_BASE_URL, process.env.WP_URL, process.env.WOOCOMMERCE_STORE_URL]) {
    const b = norm(base);
    if (!b) continue;
    const j = await tryFetchJson(`${b}/wp-json/klsd/v1/site-tz`);
    if (j?.timezone) {
      SITE_TZ = String(j.timezone);
      LAST_SOURCE = `${b}/wp-json/klsd/v1/site-tz`;
      return SITE_TZ;
    }
  }

  // 2) WooCommerce system_status (needs auth via query params)
  {
    const b = norm(process.env.WOOCOMMERCE_STORE_URL);
    const ck = process.env.WOOCOMMERCE_CONSUMER_KEY;
    const cs = process.env.WOOCOMMERCE_CONSUMER_SECRET;
    if (b && ck && cs) {
      const url = `${b}/wp-json/wc/v3/system_status?consumer_key=${encodeURIComponent(ck)}&consumer_secret=${encodeURIComponent(cs)}`;
      const j = await tryFetchJson(url);
      const tz = j?.settings?.timezone || j?.environment?.timezone;
      if (tz) {
        SITE_TZ = String(tz);
        LAST_SOURCE = url;
        return SITE_TZ;
      }
    }
  }

  // 3) WP general settings (if public)
  for (const base of [process.env.WP_BASE_URL, process.env.WP_URL]) {
    const b = norm(base);
    if (!b) continue;
    const j = await tryFetchJson(`${b}/wp-json/wp/v2/settings`);
    const tz = j?.timezone_string || j?.timezone;
    if (tz) {
      SITE_TZ = String(tz);
      LAST_SOURCE = `${b}/wp-json/wp/v2/settings`;
      return SITE_TZ;
    }
  }

  // 4) Final fallback to DEFAULT_SITE_TZ env (or America/New_York)
  SITE_TZ = process.env.DEFAULT_SITE_TZ || "America/New_York";
  LAST_SOURCE = SITE_TZ === "America/New_York" ? "fallback:hardcoded" : "env:DEFAULT_SITE_TZ";
  return SITE_TZ;
}

export function getSiteTzSource() {
  return { timezone: SITE_TZ, source: LAST_SOURCE };
}

// Refresh every hour to catch admin changes quickly
setInterval(() => {
  SITE_TZ = null;
}, 60 * 60 * 1000);
