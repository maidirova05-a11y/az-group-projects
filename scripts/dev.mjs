// Сайт (Vite) и API (Hono) одной командой — без shell, поэтому работает в любом терминале Windows.
import { spawn } from 'node:child_process';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const bin = (...p) => path.join(root, 'node_modules', ...p);
const apiPort = process.env.API_PORT || '8787';
const env = { ...process.env, API_PORT: apiPort };

const procs = [
  ['api', [bin('tsx', 'dist', 'cli.mjs'), 'watch', '--env-file=.env.local', 'server/dev.ts']],
  ['web', [bin('vite', 'bin', 'vite.js'), ...process.argv.slice(2)]],
].map(([name, args]) => {
  const child = spawn(process.execPath, args, { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
  const prefix = name === 'api' ? '\x1b[34m[api]\x1b[0m ' : '\x1b[31m[web]\x1b[0m ';
  for (const stream of [child.stdout, child.stderr]) {
    stream.on('data', d => process.stdout.write(String(d).split('\n').filter(Boolean).map(l => prefix + l).join('\n') + '\n'));
  }
  child.on('exit', code => { console.log(`${prefix}завершён (${code})`); stopAll(code ?? 1); });
  return child;
});

let stopping = false;
function stopAll(code) {
  if (stopping) return;
  stopping = true;
  for (const p of procs) if (p.exitCode === null) p.kill();
  process.exitCode = code;
}
process.on('SIGINT', () => stopAll(0));
process.on('SIGTERM', () => stopAll(0));
