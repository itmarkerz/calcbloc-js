/**
 * taxFromBands against worked examples published by tax authorities, using the bundled tables only (no network).
 * Each case cites the official page it reproduces. The same examples are used by the calcbloc.com test suite.
 */
import { describe, expect, it } from "vitest";
import { bandBreakdown, bandsSection, taxFromBands } from "../src/bands";
import { loadTable } from "../src/tables";

/** Round to the cent, as the authorities do per band in these examples. */
const cents = (n: number) => Math.round(n * 100) / 100;

describe("Ireland: Revenue, 'Calculating your USC' (2026)", () => {
  // https://www.revenue.ie/en/jobs-and-pensions/usc/calculating-usc.aspx
  const ie = loadTable("ireland", { year: "2026" });
  const usc = bandsSection(ie, "usc");
  const reduced = bandsSection(ie, "usc-reduced");
  const perBand = (income: number, s = usc) => bandBreakdown(s, income).map((b) => cents(b.tax));

  it("the bundled bands are the ones Revenue uses (0.5% to €12,012, 2% to €28,700, 3% to €70,044, 8% above)", () => {
    expect(usc.rows.map((r) => [r.from, r.to, r.rate])).toEqual([
      [0, 12012, 0.005],
      [12012, 28700, 0.02],
      [28700, 70044, 0.03],
      [70044, null, 0.08],
    ]);
    expect(usc.source.url).toMatch(/^https:\/\/www\.revenue\.ie\//);
  });
  it("Example 1, Jacob, €25,000 → €60.06 + €259.76 = €319.82", () => {
    expect(perBand(25000)).toEqual([60.06, 259.76, 0, 0]);
    expect(cents(taxFromBands(usc, 25000))).toBe(319.82);
  });
  it("Example 2, Sadhbh, €50,000 → €60.06 + €333.76 + €639.00 = €1,032.82", () => {
    expect(perBand(50000)).toEqual([60.06, 333.76, 639, 0]);
    expect(cents(taxFromBands(usc, 50000))).toBe(1032.82);
  });
  it("Example 3, Donnchadh, €50,000 with a full medical card (reduced rates) → €60.06 + €759.76 = €819.82", () => {
    expect(perBand(50000, reduced)).toEqual([60.06, 759.76]);
    expect(cents(taxFromBands(reduced, 50000))).toBe(819.82);
  });
  it("Example 4, Cian (75), €75,000 (over €60,000, so standard rates) → €2,030.62", () => {
    expect(perBand(75000)).toEqual([60.06, 333.76, 1240.32, 396.48]);
    expect(cents(taxFromBands(usc, 75000))).toBe(2030.62);
  });
});

describe("Singapore: IRAS, resident income tax rates (YA 2024 onwards)", () => {
  // https://www.iras.gov.sg/taxes/individual-income-tax/basics-of-individual-income-tax/tax-residency-and-tax-rates/individual-income-tax-rates
  // IRAS publishes the gross tax payable at the top of each band ("On the first $80,000: $3,350").
  const sg = loadTable("singapore", { year: "2026" });
  const bands = bandsSection(sg, "income-tax");
  const published: [number, number][] = [
    [20000, 0],
    [30000, 200],
    [40000, 550],
    [80000, 3350],
    [120000, 7950],
    [160000, 13950],
    [200000, 21150],
    [240000, 28750],
    [280000, 36550],
    [320000, 44550],
    [500000, 84150],
    [1000000, 199150],
  ];
  it.each(published)("chargeable income $%i → gross tax payable $%i", (income, tax) => {
    expect(cents(taxFromBands(bands, income))).toBe(tax);
  });
  it("24% above $1,000,000", () => {
    expect(cents(taxFromBands(bands, 1_100_000))).toBe(199150 + 24000);
  });
});

describe("United Kingdom: GOV.UK, 'Tax on dividends' worked example (2026 to 2027)", () => {
  // https://www.gov.uk/tax-on-dividends
  // "You get £3,000 in dividends and earn £29,570 in wages in the 2026 to 2027 tax year ... You have a Personal
  // Allowance of £12,570 ... you would pay 10.75% tax on £2,500 of dividends." (The first £500 is the dividend
  // allowance.)
  const uk = loadTable("uk", { year: "2026-27" });
  const dividends = bandsSection(uk, "dividends");
  const allowance = uk.sections.find((s) => s.id === "personal-allowance")!;
  const personalAllowance = allowance.kind === "values" ? Number(allowance.rows.find((r) => r.label === "Personal Allowance")!.value) : NaN;

  it("dividend tax £268.75: dividends sit on top of the wages, within the basic-rate band", () => {
    expect(personalAllowance).toBe(12570);
    const taxableWages = 29570 - personalAllowance; // 17,000 of the basic-rate band used by wages
    const dividendAllowance = 500;
    // Tax on the slice of the dividend bands between (wages + allowance) and (wages + all dividends).
    const tax = taxFromBands(dividends, taxableWages + 3000) - taxFromBands(dividends, taxableWages + dividendAllowance);
    expect(cents(tax)).toBe(268.75);
    expect(dividends.rows[0].rate).toBe(0.1075);
  });
});

describe("taxFromBands basics", () => {
  const bands = [
    { from: 0, to: 10000, rate: 0 },
    { from: 10000, to: 50000, rate: 0.2 },
    { from: 50000, to: null, rate: 0.4 },
  ];
  it("applies rates marginally and handles zero, negative and open-ended incomes", () => {
    expect(taxFromBands(bands, 0)).toBe(0);
    expect(taxFromBands(bands, -5)).toBe(0);
    expect(taxFromBands(bands, 10000)).toBe(0);
    expect(taxFromBands(bands, 30000)).toBe(4000);
    expect(taxFromBands(bands, 60000)).toBe(8000 + 4000);
  });
  it("refuses a values section and a non-number income", () => {
    const uk = loadTable("uk");
    const values = uk.sections.find((s) => s.kind === "values")!;
    expect(() => taxFromBands(values as never, 1000)).toThrow(TypeError);
    expect(() => taxFromBands(bands, Number.NaN)).toThrow(TypeError);
  });
});
