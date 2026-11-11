import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CalcBlocError } from "../src/errors";
import { getCountry, listCountries, loadTable, loadTablesWithRegions, manifest } from "../src/tables";
import integrity from "./data-integrity.json";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const URL_RE = /^https?:\/\/\S+\.\S+/;

/** Every bundled file as (country, year, region) from the manifest; no country is named in this test. */
const files = manifest.countries.flatMap((c) =>
  c.files.map((f) => {
    const [, year, region] = f.replace(/\.json$/, "").split("/");
    return { country: c.country, year, region: region ?? undefined, file: f };
  }),
);

describe("manifest", () => {
  it("lists countries with years, files, page and API URLs, sources and a verification date", () => {
    expect(manifest.countries.length).toBeGreaterThan(0);
    expect(manifest.licence).toBe("CC BY 4.0");
    expect(manifest.credit).toBe("Data by CalcBloc (calcbloc.com/data)");
    for (const c of manifest.countries) {
      expect(c.country).toMatch(/^[a-z0-9-]+$/);
      expect(c.years[0]).toBe(c.current_year);
      expect(c.files).toContain(`${c.country}/${c.current_year}.json`);
      expect(c.pageUrl).toMatch(/^https:\/\/calcbloc\.com\//);
      expect(c.apiUrl).toBe(`https://calcbloc.com/api/v1/tax-tables/${c.country}/${c.current_year}`);
      expect(c.lastVerified).toMatch(DATE);
      expect(c.sourceUrls.length).toBeGreaterThan(0);
      for (const u of c.sourceUrls) expect(u).toMatch(URL_RE);
    }
  });
  it("listCountries and getCountry read the manifest", () => {
    expect(listCountries().map((c) => c.country)).toEqual(manifest.countries.map((c) => c.country));
    const first = manifest.countries[0];
    expect(getCountry(first.country.toUpperCase())).toBe(first);
    expect(getCountry("atlantis")).toBeUndefined();
  });
  it("bundles every file the integrity record lists (the current year of every country at least)", () => {
    expect(files.map((f) => f.file).sort()).toEqual(Object.keys(integrity.files).sort());
  });
});

describe("offline loader", () => {
  it("restores every table exactly as the API serves it (SHA-256 of the original file)", () => {
    const record = integrity.files as Record<string, { sha256: string; rows: number }>;
    const mismatches: string[] = [];
    for (const f of files) {
      const t = loadTable(f.country, { year: f.year, region: f.region });
      const hash = createHash("sha256").update(JSON.stringify(t)).digest("hex");
      if (hash !== record[f.file].sha256 || t.rows.length !== record[f.file].rows) mismatches.push(f.file);
    }
    expect(mismatches).toEqual([]);
  });

  it("year defaults to latest (the current year) and sets requested_year like the API", () => {
    for (const c of manifest.countries) {
      const t = loadTable(c.country);
      expect(t.year).toBe(c.current_year);
      expect(t.requested_year).toBe("latest");
      expect(t.current_year).toBe(c.current_year);
      expect(t.region).toBeNull();
      expect(loadTable(c.country, { year: c.current_year }).requested_year).toBe(c.current_year);
    }
  });

  it("loads regional tables by code or slug", () => {
    const c = manifest.countries.find((x) => x.regions.length > 0)!;
    const r = c.regions[0];
    const byCode = loadTable(c.country, { region: r.code });
    expect(byCode.region).toEqual({ code: r.code, slug: r.slug, name: r.name });
    expect(loadTable(c.country, { region: r.slug }).pageUrl).toBe(byCode.pageUrl);
    const all = loadTablesWithRegions(c.country);
    expect(all.national.region).toBeNull();
    expect(all.regions.length).toBe(c.regions.length);
  });

  it("returns a fresh object each call", () => {
    const c = manifest.countries[0];
    const a = loadTable(c.country);
    a.sections.length = 0;
    expect(loadTable(c.country).sections.length).toBeGreaterThan(0);
  });

  it("throws CalcBlocError with the API's codes", () => {
    const err = (fn: () => unknown) => {
      try {
        fn();
      } catch (e) {
        return e as CalcBlocError;
      }
      throw new Error("expected an error");
    };
    expect(err(() => loadTable("atlantis"))).toMatchObject({ code: "unsupported_country", status: 404 });
    expect(err(() => loadTable("atlantis"))).toBeInstanceOf(CalcBlocError);
    const c = manifest.countries[0];
    expect(err(() => loadTable(c.country, { year: "1999" }))).toMatchObject({ code: "unsupported_year", status: 404 });
    const noRegions = manifest.countries.find((x) => x.regions.length === 0)!;
    expect(err(() => loadTable(noRegions.country, { region: "x" }))).toMatchObject({ code: "unsupported_region", status: 400 });
    const withRegions = manifest.countries.find((x) => x.regions.length > 0)!;
    expect(err(() => loadTable(withRegions.country, { region: "nowhere" }))).toMatchObject({ code: "unsupported_region" });
  });
});

describe("schema sanity: every row of every table", () => {
  it("has source_url, source_title, retrieved_at, effective_from, tax year and a known status", () => {
    let rows = 0;
    const problems: string[] = [];
    const statuses = new Set(["verified", "under_review", "not_applicable"]);
    const units = new Set(["rate", "money", "number", "text"]);
    for (const f of files) {
      const t = loadTable(f.country, { year: f.year, region: f.region });
      for (const r of t.rows) {
        const where = `${f.file} ${r.section_id} "${r.label}"`;
        if (!URL_RE.test(r.source_url ?? "")) problems.push(`${where}: source_url`);
        if (!r.source_title?.trim()) problems.push(`${where}: source_title`);
        if (!DATE.test(r.retrieved_at ?? "")) problems.push(`${where}: retrieved_at`);
        if (!DATE.test(r.effective_from ?? "")) problems.push(`${where}: effective_from`);
        if (r.tax_year !== t.year) problems.push(`${where}: tax_year`);
        if (!statuses.has(r.status)) problems.push(`${where}: status ${r.status}`);
        if (!units.has(r.unit)) problems.push(`${where}: unit ${r.unit}`);
        rows++;
      }
    }
    expect(problems).toEqual([]);
    expect(rows).toBeGreaterThan(1000);
  });

  it("tables carry the API's top-level fields and CC BY 4.0 attribution", () => {
    for (const f of files) {
      const t = loadTable(f.country, { year: f.year, region: f.region });
      expect(t.country).toBe(f.country);
      expect(t.year).toBe(f.year);
      expect(t.currency).toMatch(/^[A-Z]{3}$/);
      expect(t.effectiveFrom).toMatch(DATE);
      expect(t.years_available).toContain(t.year);
      expect(t.pageUrl).toMatch(/^https:\/\/calcbloc\.com\//);
      expect(t.attribution).toMatchObject({ source: "CalcBloc", licence: "CC BY 4.0", credit: "Data by CalcBloc (calcbloc.com/data)" });
      expect(Array.isArray(t.sections) && t.sections.length > 0, f.file).toBe(true);
    }
  });

  it("band sections are ordered, contiguous and use decimal rates", () => {
    const problems: string[] = [];
    for (const f of files) {
      const t = loadTable(f.country, { year: f.year, region: f.region });
      for (const s of t.sections) {
        if (s.kind !== "bands") continue;
        s.rows.forEach((r, i) => {
          const where = `${f.file} ${s.id} row ${i}`;
          if (typeof r.from !== "number") problems.push(`${where}: from`);
          if (!(r.rate >= 0 && r.rate <= 1)) problems.push(`${where}: rate ${r.rate}`);
          if (r.to !== null && !(r.to > r.from)) problems.push(`${where}: to <= from`);
          if (i > 0 && r.from < s.rows[i - 1].from) problems.push(`${where}: out of order`);
        });
        if (s.rows[s.rows.length - 1].to !== null) problems.push(`${f.file} ${s.id}: top band is not open-ended`);
      }
    }
    expect(problems).toEqual([]);
  });

  it("package data is minified JSON without the flat rows (rebuilt at load time)", () => {
    const f = files[0];
    const raw = readFileSync(new URL(`../data/${f.file}`, import.meta.url), "utf8");
    expect(raw.includes("\n")).toBe(false);
    expect("rows" in JSON.parse(raw)).toBe(false);
  });
});
