import { describe, expect, it } from "vitest";
import { BANNER_KEY, bannerBootstrap, isBannerDismissed } from "@/lib/bannerDismiss";

describe("patch banner dismissal", () => {
  it("stays closed only for the patch it was closed on", () => {
    expect(isBannerDismissed("0.5.5", "0.5.5")).toBe(true);
    expect(isBannerDismissed("0.5.4", "0.5.5")).toBe(false);
    expect(isBannerDismissed(null, "0.5.5")).toBe(false);
  });

  it("bootstrap sets the attribute only on a matching patch", () => {
    const run = (stored: string | null, patch: string) => {
      const attrs: Record<string, string> = {};
      const localStorage = { getItem: (k: string) => (k === BANNER_KEY ? stored : null) };
      const document = { documentElement: { setAttribute: (k: string, v: string) => (attrs[k] = v) } };
      new Function("localStorage", "document", bannerBootstrap(patch))(localStorage, document);
      return "data-banner-dismissed" in attrs;
    };
    expect(run("0.5.5", "0.5.5")).toBe(true);
    expect(run("0.5.4", "0.5.5")).toBe(false);
    expect(run(null, "0.5.5")).toBe(false);
  });
});
