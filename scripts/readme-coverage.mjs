#!/usr/bin/env node
/**
 * Writes the coverage table in README.md (between <!-- coverage:start --> and <!-- coverage:end -->) from
 * data/manifest.json.
 *
 *   node scripts/readme-coverage.mjs [--live <url-or-file>]
 *
 * --live  The /api/v1/countries response (a URL such as https://calcbloc.com/api/v1/countries, or a saved JSON
 *         file). Countries that are bundled but not yet published on calcbloc.com are then listed without links,
 *         so the README never links to a page that does not exist yet. A manifest entry with `"live": false` is
 *         treated the same way. Without --live, every country is linked.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const README = join(ROOT, "README.md");
const START = "<!-- coverage:start -->";
const END = "<!-- coverage:end -->";

const args = process.argv.slice(2);
const liveArg = args.includes("--live") ? args[args.indexOf("--live") + 1] : undefined;

const manifest = JSON.parse(readFileSync(join(ROOT, "data", "manifest.json"), "utf8"));

let live = null;
if (liveArg) {
  const text = /^https?:\/\//.test(liveArg) ? await (await fetch(liveArg, { headers: { Accept: "application/json" } })).text() : readFileSync(liveArg, "utf8");
  live = new Set(JSON.parse(text).countries.map((c) => c.code));
}

// Referral tag for the README's links to calcbloc.com (the bundled pageUrl values stay plain).
const README_UTM = "utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss";
const readmeLink = (url) => {
  const [base, ...hash] = url.split("#");
  return `${base}${base.includes("?") ? "&" : "?"}${README_UTM}${hash.length ? `#${hash.join("#")}` : ""}`;
};

const isLive = (c) => c.live !== false && (live === null || live.has(c.country));
const fmtDate = (d) => {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day)).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
};

const lines = [
  "| Country | id | Tax years | Regions | Last checked |",
  "| --- | --- | --- | --- | --- |",
];
let unpublished = 0;
for (const c of manifest.countries) {
  const published = isLive(c);
  if (!published) unpublished++;
  const name = published ? `[${c.name}](${readmeLink(c.pageUrl)})` : `${c.name} *`;
  const regionFiles = c.files.filter((f) => f.split("/").length > 2).length;
  const regions = c.regions.length ? `${c.regions.length}${regionFiles ? "" : " (via the API)"}` : "–";
  lines.push(`| ${name} | \`${c.country}\` | ${c.years.join(", ")} | ${regions} | ${fmtDate(c.lastVerified)} |`);
}

const notes = [
  "",
  `${manifest.countries.length} countries, generated from the bundled \`manifest.json\` (data of ${fmtDate(manifest.generatedAt)}). **Regions** is the number of regional tables (states, provinces, cantons, nations...) bundled for the country; \`listCountries()\` returns their codes and names.`,
];
if (unpublished) notes.push("", `\\* Bundled in the package; the calcbloc.com page and the API endpoint for this country are not published yet.`);
if (manifest.pending?.length) notes.push("", `In preparation: ${manifest.pending.map((p) => p.name).join(", ")}.`);

const block = `${START}\n${[...lines, ...notes].join("\n")}\n${END}`;
const readme = readFileSync(README, "utf8");
const a = readme.indexOf(START);
const b = readme.indexOf(END);
if (a < 0 || b < a) throw new Error(`README.md needs ${START} and ${END} markers`);
writeFileSync(README, readme.slice(0, a) + block + readme.slice(b + END.length));
console.log(`README coverage: ${manifest.countries.length} countries${live ? `, ${unpublished} not yet published` : ""}`);
