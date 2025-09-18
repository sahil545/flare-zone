const MS_THRESHOLD = 1_000_000_000_000; // ~2001-11-20 in ms
const MIN_VALID = Date.UTC(2000, 0, 1);

function parseNaiveDateTime(s: string) {
  const re = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/;
  const m = re.exec(s);
  if (!m) return null;
  const [_, y, mo, d, h = "00", mi = "00", se = "00"] = m;
  return {
    y: Number(y),
    mo: Number(mo),
    d: Number(d),
    h: Number(h),
    mi: Number(mi),
    se: Number(se),
  };
}

function getTzOffsetMs(utcTs: number, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(new Date(utcTs));
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  const asUTC = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour),
    Number(map.minute),
    Number(map.second),
  );
  return asUTC - utcTs;
}

function zonedNaiveToUtcMs(s: string, timeZone: string): number | null {
  const parsed = parseNaiveDateTime(s);
  if (!parsed) return null;
  const { y, mo, d, h, mi, se } = parsed;
  const localTs = Date.UTC(y, mo - 1, d, h, mi, se);
  let offset = getTzOffsetMs(localTs, timeZone);
  let utcTs = localTs - offset;
  const offset2 = getTzOffsetMs(utcTs, timeZone);
  if (offset2 !== offset) {
    offset = offset2;
    utcTs = localTs - offset;
  }
  return utcTs;
}

export function toUtcMs(input: string | number | null | undefined, siteTz: string): number | null {
  if (input == null) return null;

  if (typeof input === "number") {
    const ms = input < MS_THRESHOLD ? input * 1000 : input;
    return Number.isFinite(ms) && ms >= MIN_VALID ? ms : null;
  }

  const s = String(input).trim();
  if (!s) return null;

  if (/^\d+$/.test(s)) {
    // Assume Unix seconds when it's all digits
    const sec = parseInt(s, 10);
    const ms = sec < MS_THRESHOLD / 1000 ? sec * 1000 : sec; // tolerate ms
    return ms >= MIN_VALID ? ms : null;
  }

  if (/[zZ]|[+\-]\d{2}:\d{2}$/.test(s)) {
    const ms = Date.parse(s);
    return Number.isFinite(ms) && ms >= MIN_VALID ? ms : null;
  }

  try {
    const normalized = s.replace(" ", "T");
    const ms = zonedNaiveToUtcMs(normalized, siteTz);
    return ms != null && ms >= MIN_VALID ? ms : null;
  } catch {
    return null;
  }
}
