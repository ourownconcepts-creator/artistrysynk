#!/usr/bin/env node
/**
 * Post-build guard against bundler defects that only surface in production.
 *
 * Background: a Vite 8 / Rolldown defect dropped shared declarations (e.g.
 * `createSsrRpc`, `UPLOAD_BUCKETS`) from the SSR bundle while keeping every
 * reference to them, producing HTTP 500 on every route. The build itself
 * succeeded, so nothing caught it before deploy. These checks fail the build
 * instead.
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const errors = [];

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(mjs|js)$/.test(entry)) out.push(full);
  }
  return out;
}

const serverFiles = walk(join(root, "dist", "server"));
const clientFiles = walk(join(root, "dist", "client", "assets"));

if (serverFiles.length === 0) errors.push("dist/server contains no JS output.");
if (clientFiles.length === 0) errors.push("dist/client/assets contains no JS output.");

// 1. Framework runtime must expose createSsrRpc as a real declaration somewhere
//    in the server output, not just as a reference.
const DECL = (name) =>
  new RegExp(
    `(?:var|let|const|function)\\s+${name}\\b|${name}\\s*(?:=|:)\\s*(?:function|\\()`,
  );

function checkSymbol(files, name, label) {
  const referencing = files.filter((f) => readFileSync(f, "utf8").includes(name));
  if (referencing.length === 0) return;
  const declared = referencing.some((f) => DECL(name).test(readFileSync(f, "utf8")));
  if (!declared) {
    errors.push(
      `${label}: "${name}" is referenced in ${referencing.length} chunk(s) but never declared — bundler dropped the declaration.`,
    );
  }
}

checkSymbol(serverFiles, "createSsrRpc", "SSR bundle");
checkSymbol(serverFiles, "UPLOAD_BUCKETS", "SSR bundle");

// 2. Generic sweep: any `$`-suffixed deconflicted identifier that is referenced
//    inside a chunk but neither declared nor imported in that chunk.
for (const file of [...serverFiles, ...clientFiles]) {
  const code = readFileSync(file, "utf8");
  // Bindings brought in by import/export-from statements are legitimate.
  const imported = new Set();
  for (const stmt of code.match(/(?:^|[;\n])\s*(?:import|export)[^;]*?from\s*["'][^"']+["']/g) ?? []) {
    for (const name of stmt.match(/[A-Za-z_$][A-Za-z0-9_$]*\$\d+/g) ?? []) imported.add(name);
  }
  const referenced = new Set(code.match(/[A-Za-z_$][A-Za-z0-9_$]*\$\d+/g) ?? []);
  for (const name of referenced) {
    if (imported.has(name)) continue;
    const escaped = name.replace(/\$/g, "\\$");
    const declared = new RegExp(
      `(?:var|let|const|function|class)\\s+${escaped}[^A-Za-z0-9_$]|${escaped}\\s*(?:=[^=]|,|\\)|\\]|\\}|:)|as\\s+${escaped}[^A-Za-z0-9_$]`,
    ).test(code);
    if (!declared) {
      errors.push(`${file}: "${name}" referenced but never declared in the chunk.`);
    }
  }
}

if (errors.length > 0) {
  console.error("\nPost-build verification FAILED:\n");
  for (const e of errors) console.error("  - " + e);
  console.error(
    "\nThis usually means the bundler dropped or reordered a declaration.\n" +
      "Do not change app code to work around it: verify the pinned versions of\n" +
      "vite, @tanstack/react-start, @tanstack/router-plugin and\n" +
      "@lovable.dev/vite-tanstack-config in package.json.\n",
  );
  process.exit(1);
}

console.log(
  `Post-build verification passed (${serverFiles.length} server chunks, ${clientFiles.length} client chunks).`,
);