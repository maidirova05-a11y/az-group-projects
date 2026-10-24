// Локальный PostgreSQL для разработки: отдельный кластер на порту 5433,
// данные вне OneDrive (%LOCALAPPDATA%\az-group\pgdata), вход без пароля только с localhost.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const bin = process.env.PG_BIN ?? 'C:/Program Files/PostgreSQL/18/bin';
const root = path.join(process.env.LOCALAPPDATA ?? path.join(process.env.HOME ?? '.', '.local'), 'az-group');
const data = path.join(root, 'pgdata');
const run = (exe, args) => execFileSync(path.join(bin, exe), args, { stdio: 'inherit' });

const cmd = process.argv[2];
if (cmd === 'start') {
  if (!existsSync(data)) {
    mkdirSync(root, { recursive: true });
    run('initdb.exe', ['-D', data, '-U', 'postgres', '-A', 'trust', '-E', 'UTF8', '--locale=C']);
  }
  try { run('pg_ctl.exe', ['-D', data, 'status']); console.log('Уже запущен'); }
  catch {
    // Отсоединяем процесс сервера, чтобы команда завершилась сразу.
    run('pg_ctl.exe', ['-D', data, '-o', '-p 5433', '-l', path.join(root, 'pg.log'), '-W', 'start']);
  }
  for (const name of ['azgroup', 'azgroup_test']) {
    try { run('psql.exe', ['-h', 'localhost', '-p', '5433', '-U', 'postgres', '-qc', `create database ${name}`]); } catch { /* уже есть */ }
  }
} else if (cmd === 'stop') {
  run('pg_ctl.exe', ['-D', data, 'stop']);
} else {
  console.log('Использование: node scripts/local-db.mjs start|stop');
}
