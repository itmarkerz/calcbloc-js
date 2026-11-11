import type { ExportRow, RowStatus, Section, TaxTable } from "./types";

/** A bundled table: the API shape, stored without the flat `rows` array (rebuilt from `sections` on load). */
export type StoredTable = Omit<TaxTable, "rows"> & { rows?: ExportRow[] };

/**
 * Rebuilds the flat export rows (one per band or value) from the sections, exactly as the API serves them:
 * same order, same keys, each row carrying its tax year, effective dates, official source and status.
 */
export function buildRows(t: Pick<TaxTable, "sections" | "year" | "effectiveFrom" | "effectiveTo">): ExportRow[] {
  const out: ExportRow[] = [];
  for (const s of t.sections as Section[]) {
    const sectionStatus: RowStatus = s.verified ? "verified" : "under_review";
    const common = (src: Section["source"], note: string | undefined, status: RowStatus) => ({
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
        const status: RowStatus = r.status === "not_applicable" ? "not_applicable" : sectionStatus;
        out.push({
          ...common(r.source ?? s.source, r.note, status),
          label: r.label,
          from: null,
          to: null,
          rate: r.unit === "rate" ? (r.value as number | null) : null,
          value: r.unit === "rate" ? null : r.value,
          unit: r.unit,
        });
      }
    }
  }
  return out;
}

/** The full API-shaped table: `rows` rebuilt (if absent) and placed where the API puts it. */
export function hydrateTable(stored: StoredTable): TaxTable {
  if (Array.isArray(stored.rows)) return stored as TaxTable;
  const rows = buildRows(stored);
  const out: Record<string, unknown> = {};
  let placed = false;
  for (const [k, v] of Object.entries(stored)) {
    if (k === "pageUrl" && !placed) {
      out.rows = rows;
      placed = true;
    }
    out[k] = v;
  }
  if (!placed) out.rows = rows;
  return out as unknown as TaxTable;
}
