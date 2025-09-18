export function fmtLocal(utcMs: number | Date, tz: string, opts?: Intl.DateTimeFormatOptions) {
  const ms = utcMs instanceof Date ? utcMs.getTime() : Number(utcMs || 0);
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: tz,
    ...opts,
  }).format(new Date(ms));
}
