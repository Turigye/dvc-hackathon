import { describe, expect, it } from "vitest";
import { createClientId } from "./client-id";

describe("createClientId", () => {
  it("creates a usable guest id when secure crypto is unavailable on a LAN URL", () => {
    expect(createClientId({ random: () => 0.5, now: () => 1_000, uuid: undefined })).toBe("guest-rs-zik0zj");
  });

  it("prefers a native UUID whenever the browser provides one", () => {
    expect(createClientId({ uuid: () => "native-uuid" })).toBe("native-uuid");
  });
});
