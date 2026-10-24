/** Переменные окружения бэкенда. Локально читаются из .env.local (см. .env.example). */
function need(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (!v) throw new Error(`Не задана переменная окружения ${name}`);
  return v;
}

const isProd = () => process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';

export const env = {
  get databaseUrl() { return need('DATABASE_URL'); },
  /** Секрет подписи сессий админки (JWT HS256). Минимум 32 символа, не значение-пример из .env.example. */
  get jwtSecret() {
    const v = need('JWT_SECRET');
    if (v.length < 32) throw new Error('JWT_SECRET слишком короткий: нужно не меньше 32 случайных символов (например, `openssl rand -hex 32`)');
    if (v.toLowerCase().includes('change-me')) throw new Error('JWT_SECRET содержит значение-пример «change-me» — задайте свой случайный секрет');
    return v;
  },
  /** Соль для хэша IP (заявки, журнал входа). В production обязательна; локально — 'dev-salt'. */
  get ipSalt() {
    const v = process.env.IP_SALT;
    if (v) return v;
    if (isProd()) throw new Error('Не задана переменная окружения IP_SALT (обязательна в production)');
    return 'dev-salt';
  },
  /** Доверять X-Forwarded-For (только за своим reverse-proxy): TRUST_PROXY=1. */
  get trustProxy() { return process.env.TRUST_PROXY === '1'; },
  get isProd() { return isProd(); },
};
