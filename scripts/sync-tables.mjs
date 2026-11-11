#!/usr/bin/env node
/**
 * Copies the CalcBloc tax tables into this package's data/ directory.
 *
 *   node scripts/sync-tables.mjs [--from <dir>] [--to <dir>] [--national-only] [--keep-rows]
 *
 * --from   Source directory with manifest.json and <country>/<year>.json files.
 *          Default: ../calcbloc-data/tables (the sibling calcbloc-data repo), or $CALCBLOC_TABLES_DIR.
 * --to     Destination. Default: data/ in this repo. It is emptied first.
 * --national-only   Skip regional files (<country>/<year>/<region>.json).
 * --keep-rows       Keep the flat `rows` array in every file instead of rebuilding it at load time.
 *
 * Every source file is in the exact shape of GET /api/v1/tax-tables/{country}/{year}[?region=]. To keep the package
 * small, the flat `rows` array (one row per band or value, which repeats data already in `sections`) is removed
 * and rebuilt by the loader, but only when this script can rebuild it byte for byte; otherwise the file keeps its
 * rows. The SHA-256 of every original file is written to test/data-integrity.json, and the test suite checks that
 * the loader restores each table exactly.
 *
 * The country list always comes from manifest.json: nothing here names a country.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync, statSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function parseArgs(argv) {
  const opts = { from: process.env.CALCBLOC_TABLES_DIR || resolve(ROOT, "..", "calcbloc-data", "tables"), to: join(ROOT, "data"), nationalOnly: false, keepRows: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--from") opts.from = resolve(argv[++i]);
    else if (a === "--to") opts.to = resolve(argv[++i]);
    else if (a === "--national-only") opts.nationalOnly = true;
    else if (a === "--keep-rows") opts.keepRows = true;
    else if (a === "--help" || a === "-h") {
      console.log("Usage: node scripts/sync-tables.mjs [--from <dir>] [--to <dir>] [--national-only] [--keep-rows]");
      process.exit(0);
    } else throw new Error(`Unknown argument: ${a}`);
  }
  return opts;
}

/** Rebuilds the flat export rows from `sections`, in the order and with the keys the API uses (OpenAPI 1.1.0+). */
export function buildRows(t) {
  const out = [];
  for (const s of t.sections) {
    const sectionStatus = s.verified ? "verified" : "under_review";
    const common = (src, note, status) => ({
      section_id: s.id,
      section: s.title,
      group: s.group,
      basis: s.basis ?? "",
      note: note ?? s.note ?? "",
      tax_year: t.year,
      effective_from: src.effectiveFrom ?? t.effectiveFrom,
      effective_to: src.effectiveTo === undefined ? t.effectiveTo : src.effectiveTo,
      source_title: src.title,
      source_url: src.url,
      retrieved_at: src.retrievedAt,
      status,
    });
    if (s.kind === "bands") {
      for (const r of s.rows) out.push({ ...common(s.source, undefined, sectionStatus), label: r.label ?? "", from: r.from, to: r.to, rate: r.rate, value: null, unit: "rate" });
    } else {
      for (const r of s.rows) {
        const status = r.status === "not_applicable" ? "not_applicable" : sectionStatus;
        out.push({ ...common(r.source ?? s.source, r.note, status), label: r.label, from: null, to: null, rate: r.unit === "rate" ? r.value : null, value: r.unit === "rate" ? null : r.value, unit: r.unit });
      }
    }
  }
  return out;
}

/** The table with `rows` put back where the API places it (after years_available, before pageUrl). */
export function withRows(stripped, rows) {
  const out = {};
  let placed = false;
  for (const [k, v] of Object.entries(stripped)) {
    if (k === "pageUrl" && !placed) {
      out.rows = rows;
      placed = true;
    }
    out[k] = v;
  }
  if (!placed) out.rows = rows;
  return out;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function checkTable(file, t) {
  const problems = [];
  for (const k of ["country", "year", "currency", "sections", "sources", "rows"]) if (!(k in t)) problems.push(`missing "${k}"`);
  if (!Array.isArray(t.sections)) problems.push("sections is not an array");
  if (!Array.isArray(t.rows)) problems.push("rows is not an array");
  for (const [i, r] of (t.rows ?? []).entries()) {
    if (!/^https?:\/\/\S+\.\S+/.test(r.source_url ?? "")) problems.push(`row ${i} (${r.section_id} "${r.label}"): no source_url`);
    if (!DATE.test(r.retrieved_at ?? "")) problems.push(`row ${i} (${r.section_id} "${r.label}"): no retrieved_at`);
  }
  if (problems.length) throw new Error(`${file}: ${problems.slice(0, 10).join("; ")}${problems.length > 10 ? ` (+${problems.length - 10} more)` : ""}`);
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const manifestPath = join(opts.from, "manifest.json");
  if (!existsSync(manifestPath)) {
    console.error(`No manifest.json in ${opts.from}.\nPass --from <dir> or set CALCBLOC_TABLES_DIR (the calcbloc-data repo's tables/ directory).`);
    process.exit(1);
  }
  const manifestText = readFileSync(manifestPath, "utf8");
  const manifest = JSON.parse(manifestText);
  if (!Array.isArray(manifest.countries) || manifest.countries.length === 0) throw new Error("manifest.json has no countries");

  if (resolve(opts.to) === resolve(opts.from)) throw new Error("--to must differ from --from");
  rmSync(opts.to, { recursive: true, force: true });
  mkdirSync(opts.to, { recursive: true });

  const integrity = {};
  let bytesIn = 0;
  let bytesOut = 0;
  let files = 0;
  let stripped = 0;
  let skippedRegional = 0;

  for (const c of manifest.countries) {
    if (!Array.isArray(c.files)) throw new Error(`manifest: ${c.country} has no files list`);
    for (const rel of c.files) {
      const regional = rel.split("/").length > 2;
      if (regional && opts.nationalOnly) {
        skippedRegional++;
        continue;
      }
      const src = join(opts.from, ...rel.split("/"));
      if (!existsSync(src)) throw new Error(`manifest lists ${rel} but ${src} does not exist`);
      const text = readFileSync(src, "utf8");
      bytesIn += statSync(src).size;
      const table = JSON.parse(text);
      checkTable(rel, table);
      if (table.country !== c.country) throw new Error(`${rel}: country "${table.country}" does not match the manifest (${c.country})`);
      const canonical = JSON.stringify(table);
      integrity[rel] = { sha256: createHash("sha256").update(canonical).digest("hex"), rows: table.rows.length };

      let out = table;
      if (!opts.keepRows) {
        const { rows, ...rest } = table;
        if (JSON.stringify(withRows(rest, buildRows(rest))) === canonical) {
          out = rest;
          stripped++;
        } else {
          console.warn(`  keeping rows in ${rel}: they cannot be rebuilt exactly from sections`);
        }
      }
      const dest = join(opts.to, ...rel.split("/"));
      mkdirSync(dirname(dest), { recursive: true });
      const json = JSON.stringify(out);
      writeFileSync(dest, json);
      bytesOut += Buffer.byteLength(json);
      files++;
    }
  }

  const bundled = opts.nationalOnly ? { ...manifest, countries: manifest.countries.map((c) => ({ ...c, files: c.files.filter((f) => f.split("/").length === 2) })) } : manifest;
  const manifestOut = JSON.stringify(bundled);
  writeFileSync(join(opts.to, "manifest.json"), manifestOut);
  bytesOut += Buffer.byteLength(manifestOut);

  const integrityPath = join(ROOT, "test", "data-integrity.json");
  mkdirSync(dirname(integrityPath), { recursive: true });
  writeFileSync(integrityPath, `${JSON.stringify({ generatedAt: manifest.generatedAt, files: integrity }, null, 1)}\n`);

  const mb = (n) => `${(n / 1024 / 1024).toFixed(2)} MB`;
  console.log(`Synced ${files} tables for ${manifest.countries.length} countries from ${opts.from}`);
  console.log(`  rows rebuilt at load time: ${stripped}/${files}${skippedRegional ? `; regional files skipped: ${skippedRegional}` : ""}`);
  console.log(`  source ${mb(bytesIn)} -> data ${mb(bytesOut)} (${opts.to.split(sep).slice(-1)[0]}/)`);
  if (manifest.pending?.length) console.log(`  pending (not in the data): ${manifest.pending.map((p) => p.country).join(", ")}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
