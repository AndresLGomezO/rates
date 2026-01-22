import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

/**
 * Inventory markdown files in the repo (excluding node_modules/dist/.git) and
 * print a report sorted by size + a quick duplicate detector by hash.
 *
 * Usage (from repo root):
 *   node scripts/docs-inventory.mjs
 */

const IGNORE_DIRS = new Set(['node_modules', 'dist', '.git']);

function walk(dir, out = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.name.startsWith('.')) continue;
    const full = path.join(dir, e.name);

    if (e.isDirectory()) {
      if (IGNORE_DIRS.has(e.name)) continue;
      walk(full, out);
      continue;
    }

    if (!e.isFile()) continue;
    if (!e.name.toLowerCase().endsWith('.md')) continue;

    const rel = path.relative(process.cwd(), full);
    const buf = fs.readFileSync(full);
    const size = buf.length;
    const hash = crypto.createHash('sha256').update(buf).digest('hex');

    out.push({ rel, size, hash });
  }
  return out;
}

const files = walk(process.cwd());
files.sort((a, b) => b.size - a.size);

console.log(`Found ${files.length} markdown files (excluding node_modules/dist/.git).`);
console.log('');

console.log('Top 20 by size:');
for (const f of files.slice(0, 20)) {
  console.log(String(f.size).padStart(9, ' '), ' ', f.rel);
}

// Detect exact duplicates (rare but useful)
const byHash = new Map();
for (const f of files) {
  const list = byHash.get(f.hash) ?? [];
  list.push(f.rel);
  byHash.set(f.hash, list);
}

const dups = [...byHash.values()].filter((v) => v.length > 1);
console.log('');
console.log(`Exact duplicates by sha256: ${dups.length}`);
if (dups.length) {
  for (const group of dups) {
    console.log('- ' + group.join('  |  '));
  }
}

