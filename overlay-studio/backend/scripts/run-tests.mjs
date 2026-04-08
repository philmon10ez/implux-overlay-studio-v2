/**
 * Cross-platform test runner (glob + node --test).
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { glob } from 'glob';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const patterns = ['lib/**/*.test.js', 'services/**/*.test.js', 'test/**/*.test.js'];
const files = (await glob(patterns, { cwd: root, nodir: true })).sort();
if (files.length === 0) {
  console.error('No test files matched:', patterns);
  process.exit(1);
}
const abs = files.map((f) => join(root, f));
const child = spawn(process.execPath, ['--test', ...abs], { stdio: 'inherit', cwd: root });
child.on('exit', (code) => process.exit(code ?? 1));
