// HTTP client cho mobile — thay dần tầng mock bằng BE thật.
//
// Base URL: ưu tiên biến môi trường Expo `EXPO_PUBLIC_API_URL`; mặc định trỏ
// thẳng vào API Gateway (YARP) cổng 6102. Android emulator không thấy
// `localhost` của máy host nên mặc định dùng `10.0.2.2`:
//
//   EXPO_PUBLIC_API_URL=http://192.168.1.10:6102/api/v1 npx expo start
//
// Token: access/refresh lưu ở AsyncStorage, gắn `Bearer` cho mọi request.
// Gặp 401 → tự gọi `/auth/refresh` rồi thử lại MỘT lần (giống webapp).
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FALLBACK_HOST = Platform.select({
  android: 'http://10.0.2.2:6102',
  default: 'http://localhost:6102',
});

export const API_BASE = (
  process.env.EXPO_PUBLIC_API_URL ?? `${FALLBACK_HOST}/api/v1`
).replace(/\/+$/, '');

const TOKEN_KEY = 'grotto-mobile-tokens-v1';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

let tokens: TokenPair | null = null;
let refreshing: Promise<TokenPair | null> | null = null;

export async function loadTokens(): Promise<TokenPair | null> {
  if (tokens) return tokens;
  try {
    const raw = await AsyncStorage.getItem(TOKEN_KEY);
    tokens = raw ? (JSON.parse(raw) as TokenPair) : null;
  } catch {
    tokens = null;
  }
  return tokens;
}

export async function saveTokens(next: TokenPair | null): Promise<void> {
  tokens = next;
  try {
    if (next) await AsyncStorage.setItem(TOKEN_KEY, JSON.stringify(next));
    else await AsyncStorage.removeItem(TOKEN_KEY);
  } catch {
    // bỏ qua — vẫn giữ token trong bộ nhớ cho phiên hiện tại
  }
}

export async function clearTokens(): Promise<void> {
  await saveTokens(null);
}

/** Lỗi HTTP. `status === 0` = không kết nối được BE (gateway chưa chạy/offline). */
export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }

  /** true khi lỗi mạng — tầng gọi có thể rơi về dữ liệu mock. */
  get offline(): boolean {
    return this.status === 0;
  }
}

export interface HttpOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  /** Bỏ Bearer (dùng cho /auth/login, /auth/refresh). */
  anonymous?: boolean;
  timeoutMs?: number;
  /** @internal chỉ dùng để chặn vòng lặp refresh vô hạn. */
  noRetry?: boolean;
}

export async function http<T>(path: string, options: HttpOptions = {}): Promise<T> {
  const { method = 'GET', body, anonymous = false, timeoutMs = 15000, noRetry = false } = options;

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (!anonymous) {
    const current = await loadTokens();
    if (current?.accessToken) headers.Authorization = `Bearer ${current.accessToken}`;
  }

  const res = await request(`${API_BASE}${path}`, { method, headers, body, timeoutMs });

  // Token hết hạn → refresh một lần rồi gọi lại.
  if (res.status === 401 && !anonymous && !noRetry && !path.startsWith('/auth/')) {
    refreshing = refreshing ?? refreshTokens();
    const fresh = await refreshing.catch(() => null);
    refreshing = null;
    if (fresh) return http<T>(path, { ...options, noRetry: true });
  }

  const text = await res.text();
  const parsed = text ? safeJson(text) : undefined;

  if (!res.ok) {
    throw new ApiError(res.status, pickError(parsed) ?? `${res.status} ${res.statusText}`, parsed);
  }
  return unwrap<T>(parsed);
}

async function request(
  url: string,
  init: { method: string; headers: Record<string, string>; body?: unknown; timeoutMs: number },
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), init.timeoutMs);
  try {
    return await fetch(url, {
      method: init.method,
      headers: init.headers,
      signal: controller.signal,
      ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
    });
  } catch (err) {
    throw new ApiError(0, 'NETWORK_ERROR', err);
  } finally {
    clearTimeout(timer);
  }
}

async function refreshTokens(): Promise<TokenPair | null> {
  const current = await loadTokens();
  if (!current?.refreshToken) return null;
  try {
    const res = await request(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { refreshToken: current.refreshToken },
      timeoutMs: 15000,
    });
    if (!res.ok) return null;
    const pair = unwrap<TokenPair>(safeJson(await res.text()));
    if (!pair?.accessToken) return null;
    await saveTokens(pair);
    return pair;
  } catch {
    return null;
  }
}

/** BE bọc payload trong `{ data: ... }` — bóc ra như webapp (`lib/api.ts`). */
function unwrap<T>(body: unknown): T {
  if (body && typeof body === 'object' && 'data' in body) {
    return (body as { data: T }).data;
  }
  return body as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/** ProblemDetails (`detail`/`title`) hoặc `{ code, message }`. */
function pickError(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') return undefined;
  const b = body as Record<string, unknown>;
  for (const key of ['detail', 'message', 'title', 'error']) {
    const value = b[key];
    if (typeof value === 'string' && value) return value;
  }
  return undefined;
}
