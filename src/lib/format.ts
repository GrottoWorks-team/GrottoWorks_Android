// Helper định dạng dùng chung — đồng bộ với webapp (GrottoWorks_FE/src/lib/format.ts).
// Mọi số/ngày trên mobile đi qua đây: thiếu dữ liệu → '—', không bao giờ ra NaN.
export const MISSING = '—';

const VN_LOCALE = 'vi-VN';

/** Số hợp lệ để hiển thị (loại null/undefined/NaN/Infinity). */
export function isNum(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

const nf = (digits = 0) =>
  new Intl.NumberFormat(VN_LOCALE, {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });

/** Tiền VNĐ: `1.234.567 ₫`. Thiếu dữ liệu → '—'. */
export function formatVnd(value: number | null | undefined): string {
  if (!isNum(value)) return MISSING;
  return `${nf(0).format(value)} ₫`;
}

/** Số lượng kèm đơn vị; số âm (dữ liệu sai) hiện 0; thiếu dữ liệu → '—'. */
export function formatQuantity(
  value: number | null | undefined,
  unit?: string | null,
  digits = 2,
): string {
  if (!isNum(value)) return MISSING;
  const safe = value < 0 ? 0 : value;
  const text = nf(digits).format(safe);
  return unit ? `${text} ${unit}` : text;
}

export function formatPercent(value: number | null | undefined, digits = 0): string {
  if (!isNum(value)) return MISSING;
  return `${nf(digits).format(value)}%`;
}

/** `45p`, `1g 30p`, `2g`. Thiếu dữ liệu → '—'. */
export function formatDuration(minutes: number | null | undefined): string {
  if (!isNum(minutes)) return MISSING;
  const total = Math.max(0, Math.round(minutes));
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (hours === 0) return `${rest}p`;
  return rest === 0 ? `${hours}g` : `${hours}g ${rest}p`;
}

export const viDate = (iso: string | null | undefined) => {
  if (!iso) return MISSING;
  return iso.length >= 10 ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : iso;
};

export function relTime(
  iso: string,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 0 || s >= 7 * 86400) return viDate(iso);
  if (s < 60) return t('notifications.justNow');
  if (s < 3600) return t('notifications.minAgo', { n: Math.floor(s / 60) });
  if (s < 86400) return t('notifications.hourAgo', { n: Math.floor(s / 3600) });
  return t('notifications.dayAgo', { n: Math.floor(s / 86400) });
}

/** @deprecated Dùng `formatVnd`. */
export const vnd = (n: number) => formatVnd(n);
