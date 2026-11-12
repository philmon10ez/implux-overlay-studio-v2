#!/usr/bin/env node
/**
 * Scan tracked files for credential-shaped text.
 * Prints the file and the rule name only. Never prints the matching text.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { relative } from 'node:path';

const PLACEHOLDER_PASSWORDS = new Set([
  'password',
  'pass',
  'secret',
  'changeme',
  'invalid',
  'example',
  'placeholder',
  'staging_pass',
  'your-password',
  'your_password',
  '[password]',
  '[your-password]',
]);

function postgresUrlHasCredential(source) {
  const re = /postgres(?:ql)?:\/\/[^:\s/'"]+:([^@\s'"]+)@/gi;
  let match;
  while ((match = re.exec(source))) {
    const password = match[1].toLowerCase();
    if (PLACEHOLDER_PASSWORDS.has(password)) continue;
    if (password.startsWith('[') && password.endsWith(']')) continue;
    return true;
  }
  return false;
}

const rules = [
  { id: 'postgres-url-with-password', test: postgresUrlHasCredential },
  { id: 'shopify-admin-token', re: /\bshpat_(?!test\b|old\b)[A-Za-z0-9]{8,}\b/ },
  { id: 'private-key', re: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { id: 'openai-secret-key', re: /\bsk-(?:live|proj)-[A-Za-z0-9]{8,}\b/ },
  { id: 'hardcoded-admin-password', re: /['"]admin123['"]/ },
];

const skip = [
  /(^|\/)node_modules\//,
  /(^|\/)dist\//,
  /(^|\/)build\//,
  /\.lock$/,
  /package-lock\.json$/,
  /scan-secrets\.mjs$/,
];

function trackedFiles() {
  const out = execFileSync(
    'git',
    ['ls-files', '-z', '--cached', '--others', '--exclude-standard'],
    { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 }
  );
  return out.split('\0').filter(Boolean);
}

const findings = [];
for (const file of trackedFiles()) {
  const normalized = file.replace(/\\/g, '/');
  if (skip.some((pattern) => pattern.test(normalized))) continue;
  let text = '';
  try {
    text = readFileSync(file);
  } catch {
    continue;
  }
  if (text.includes(0)) continue;
  const source = text.toString('utf8');
  for (const rule of rules) {
    const matched = rule.test ? rule.test(source) : rule.re.test(source);
    if (matched) findings.push(`${normalized} matches ${rule.id}`);
  }
}

if (findings.length) {
  console.error('[secret-scan] credential-shaped text found:');
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log(`[secret-scan] checked ${trackedFiles().length} tracked files`);
