import { describe, expect, it } from "vitest";
import { createClientId } from "./client-id";

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("createClientId", () => {
  it("falls back to a v4-shaped uuid when secure crypto is unavailable on a LAN URL", () => {
    // The database columns are `uuid`, so the fallback must still be a valid one.
    expect(createClientId({ random: () => 0.5, now: () => 1_000, uuid: undefined })).toMatch(UUID_V4);
  });

  it("produces different ids across calls", () => {
    expect(createClientId({ uuid: undefined })).not.toBe(createClientId({ uuid: undefined }));
  });

  it("prefers a native UUID whenever the browser provides one", () => {
    expect(createClientId({ uuid: () => "native-uuid" })).toBe("native-uuid");
  });
});
