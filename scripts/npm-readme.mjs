#!/usr/bin/env node
/**
 * The README shipped inside the npm package (and shown on npmjs.com) tags its calcbloc.com and itmarkerz.co.in
 * links with utm_medium=npm; the committed README.md keeps utm_medium=readme for GitHub. npm always reads the
 * README from the package root, so the npm copy is swapped in around `npm pack` / `npm publish`:
 *
 *   node scripts/npm-readme.mjs write     # prepack: back up README.md, write the npm variant in its place
 *   node scripts/npm-readme.mjs restore   # postpack: put the original README.md back
 *
 * If a pack fails between the two, `restore` (or the next `write`) puts the original back from the backup.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const README = join(ROOT, "README.md");
const BACKUP_DIR = join(ROOT, ".scratch");
const BACKUP = join(BACKUP_DIR, "README.github.md");

const README_UTM = /(utm_source=calcbloc-js&(?:amp;)?utm_medium=)readme\b/g;

/** README text with this repository's utm_medium=readme tags switched to utm_medium=npm. */
export function npmReadme(text) {
  let count = 0;
  const out = text.replace(README_UTM, (_, head) => {
    count += 1;
    return `${head}npm`;
  });
  if (count === 0) throw new Error("README.md has no utm_source=calcbloc-js&utm_medium=readme links to retag");
  return out;
}

function restore() {
  if (!existsSync(BACKUP)) return false;
  copyFileSync(BACKUP, README);
  rmSync(BACKUP);
  return true;
}

function write() {
  restore(); // a previous pack that failed before postpack left the npm variant in place
  mkdirSync(BACKUP_DIR, { recursive: true });
  const original = readFileSync(README, "utf8");
  const variant = npmReadme(original);
  copyFileSync(README, BACKUP);
  writeFileSync(README, variant);
  console.log("npm-readme: README.md now has utm_medium=npm (restored by postpack)");
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const cmd = process.argv[2];
  if (cmd === "write") write();
  else if (cmd === "restore") console.log(restore() ? "npm-readme: README.md restored" : "npm-readme: nothing to restore");
  else {
    console.error("usage: node scripts/npm-readme.mjs write|restore");
    process.exit(2);
  }
}
