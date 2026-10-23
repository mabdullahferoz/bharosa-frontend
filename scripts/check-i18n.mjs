// Lists t("...") strings in src/ that have no Urdu translation in src/locales/ur.ts,
// and translations whose {placeholders} don't match the English text.
// Run: npm run i18n:check   (exits 1 if anything is missing or broken)
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const src = fileURLToPath(new URL("../src", import.meta.url));
const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(tsx?|jsx?)$/.test(name) && !p.includes("locales")) files.push(p);
  }
})(src);

const unescape = (s) => JSON.parse(`"${s}"`);
const used = new Map(); // key -> first file
const callRe = /\bt\(\s*"((?:[^"\\]|\\.)*)"/g;
// Strings translated later (tables, nav labels) are wrapped in msg("...").
const markRe = /\bmsg\(\s*"((?:[^"\\]|\\.)*)"/g;
for (const f of files) {
  const code = readFileSync(f, "utf8");
  for (const re of [callRe, markRe]) {
    for (const m of code.matchAll(re)) {
      const k = unescape(m[1]);
      if (!used.has(k)) used.set(k, f.slice(src.length + 1));
    }
  }
}

const ur = readFileSync(join(src, "locales", "ur.ts"), "utf8");
const urBlock = ur.slice(ur.indexOf("export const UR:"), ur.indexOf("export const UR_ENUM"));
const dict = new Map();
for (const m of urBlock.matchAll(/^\s*"((?:[^"\\]|\\.)*)":\s*"((?:[^"\\]|\\.)*)",?\s*$/gm)) {
  dict.set(unescape(m[1]), unescape(m[2]));
}

const placeholders = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");
let problems = 0;
for (const [k, file] of used) {
  if (!dict.has(k)) {
    console.log(`MISSING  ${JSON.stringify(k)}  (${file})`);
    problems++;
  }
}
for (const [k, v] of dict) {
  if (placeholders(k) !== placeholders(v)) {
    console.log(`PLACEHOLDER MISMATCH  ${JSON.stringify(k)}  ->  ${JSON.stringify(v)}`);
    problems++;
  }
}
const unused = [...dict.keys()].filter((k) => !used.has(k));
console.log(`\n${used.size} strings used, ${dict.size} translated, ${problems} problem(s), ${unused.length} translation(s) not referenced in code (fine if used dynamically, e.g. server error messages).`);
process.exit(problems ? 1 : 0);
