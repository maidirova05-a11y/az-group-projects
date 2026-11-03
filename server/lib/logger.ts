/**
 * Структурное логирование: одна JSON-строка на событие (stdout/stderr), удобно для Vercel Logs и любого сборщика логов.
 * Секреты и персональные данные в лог не попадают: передавайте только идентификаторы и коды.
 * В тестах (NODE_ENV=test) вывод отключён, если не задан LOG_LEVEL.
 */
type Level = 'debug' | 'info' | 'warn' | 'error';
const ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

const threshold = (): number => {
  const v = process.env.LOG_LEVEL as Level | undefined;
  if (v && v in ORDER) return ORDER[v];
  return process.env.NODE_ENV === 'test' ? Infinity : ORDER.info;
};

/** Ошибку приводим к простому объекту (stack — только вне production-логов не нужен, но полезен для разбора). */
export function errorFields(e: unknown): Record<string, unknown> {
  if (e instanceof Error) {
    const code = (e as { code?: unknown }).code;
    return { errName: e.name, errMessage: e.message, ...(code !== undefined && { errCode: code }), stack: e.stack };
  }
  return { errMessage: String(e) };
}

function write(level: Level, msg: string, fields?: Record<string, unknown>) {
  if (ORDER[level] < threshold()) return;
  const line = JSON.stringify({ level, time: new Date().toISOString(), msg, ...fields });
  (level === 'error' || level === 'warn' ? console.error : console.log)(line);
}

export const log = {
  debug: (msg: string, fields?: Record<string, unknown>) => write('debug', msg, fields),
  info: (msg: string, fields?: Record<string, unknown>) => write('info', msg, fields),
  warn: (msg: string, fields?: Record<string, unknown>) => write('warn', msg, fields),
  error: (msg: string, e?: unknown, fields?: Record<string, unknown>) =>
    write('error', msg, { ...(e !== undefined && errorFields(e)), ...fields }),
};
