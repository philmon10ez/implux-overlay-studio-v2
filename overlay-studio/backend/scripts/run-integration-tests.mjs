/**
 * Runs the full test suite with DB integration tests enabled.
 * Requires DATABASE_URL and applied migrations (Prisma).
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const child = spawn(process.execPath, ['scripts/run-tests.mjs'], {
  stdio: 'inherit',
  cwd: root,
  env: { ...process.env, RUN_INTEGRATION_TESTS: '1' },
});

child.on('exit', (code) => process.exit(code ?? 1));
