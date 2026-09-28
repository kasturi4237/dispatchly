import { describe, it, expect } from "vitest";
import { createCampaignSchema } from "../src/validators/campaignValidators";

const future = new Date(Date.now() + 60_000).toISOString();

describe("createCampaignSchema", () => {
  it("accepts a well-formed payload and lower-cases + dedupes recipients", () => {
    const parsed = createCampaignSchema.parse({
      subject: "Hello",
      body: "World",
      recipients: ["Person@Example.com", "person@example.com", "other@example.com"],
      startAt: future,
      spacingMs: 2000,
      hourlyCap: 50,
    });
    expect(parsed.recipients.sort()).toEqual(["other@example.com", "person@example.com"]);
  });

  it("rejects an empty recipient list", () => {
    expect(() =>
      createCampaignSchema.parse({
        subject: "Hi",
        body: "Body",
        recipients: [],
        startAt: future,
        spacingMs: 2000,
        hourlyCap: 10,
      })
    ).toThrow();
  });

  it("rejects a malformed recipient address", () => {
    expect(() =>
      createCampaignSchema.parse({
        subject: "Hi",
        body: "Body",
        recipients: ["not-an-email"],
        startAt: future,
        spacingMs: 2000,
        hourlyCap: 10,
      })
    ).toThrow();
  });

  it("rejects a startAt in the past", () => {
    expect(() =>
      createCampaignSchema.parse({
        subject: "Hi",
        body: "Body",
        recipients: ["a@example.com"],
        startAt: new Date(Date.now() - 3_600_000).toISOString(),
        spacingMs: 2000,
        hourlyCap: 10,
      })
    ).toThrow();
  });

  it("rejects an hourlyCap above the configured ceiling", () => {
    expect(() =>
      createCampaignSchema.parse({
        subject: "Hi",
        body: "Body",
        recipients: ["a@example.com"],
        startAt: future,
        spacingMs: 2000,
        hourlyCap: 999999,
      })
    ).toThrow();
  });
});
