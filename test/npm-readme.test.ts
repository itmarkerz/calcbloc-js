import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { npmReadme } from "../scripts/npm-readme.mjs";

const TAG = (medium: string) => `utm_source=calcbloc-js&utm_medium=${medium}&utm_campaign=itmarkerz-oss`;

describe("npm README variant (scripts/npm-readme.mjs, run by prepack)", () => {
  const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");

  it("keeps utm_medium=readme in the committed README (GitHub)", () => {
    expect(readme).toContain(TAG("readme"));
    expect(readme).not.toContain("utm_medium=npm");
  });

  it("tags every README link with utm_medium=npm and changes nothing else", () => {
    const npm = npmReadme(readme);
    expect(npm).not.toContain("utm_medium=readme");
    expect(npm.split(TAG("npm")).length).toBe(readme.split(TAG("readme")).length);
    expect(npm.replaceAll("utm_medium=npm", "utm_medium=readme")).toBe(readme);
  });

  it("refuses a README without tagged links", () => {
    expect(() => npmReadme("# no links")).toThrow();
  });
});
