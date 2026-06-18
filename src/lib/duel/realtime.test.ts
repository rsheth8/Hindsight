import { afterEach, describe, expect, it, vi } from "vitest";

const createTokenRequest = vi.fn(async () => ({ keyName: "test", mac: "abc" }));
const publish = vi.fn(async () => undefined);
const get = vi.fn(() => ({ publish }));

vi.mock("ably", () => ({
  default: {
    Rest: vi.fn(() => ({
      auth: { createTokenRequest },
      channels: { get },
    })),
  },
}));

import {
  createMatchTokenRequest,
  duelChannelName,
  DUEL_UPDATE_EVENT,
  publishMatchUpdated,
} from "./realtime";

describe("duel realtime", () => {
  afterEach(() => {
    delete process.env.ABLY_API_KEY;
    vi.clearAllMocks();
  });

  it("names channels consistently", () => {
    expect(duelChannelName("abc123")).toBe("match:abc123");
    expect(DUEL_UPDATE_EVENT).toBe("updated");
  });

  it("returns null token without ABLY_API_KEY", async () => {
    expect(await createMatchTokenRequest("m1", "dev-1")).toBeNull();
    expect(await publishMatchUpdated("m1")).toBeUndefined();
    expect(createTokenRequest).not.toHaveBeenCalled();
  });

  it("mints a scoped token and publishes updates when configured", async () => {
    process.env.ABLY_API_KEY = "app.key:secret";
    const token = await createMatchTokenRequest("m1", "dev-1");
    expect(token).toEqual({ keyName: "test", mac: "abc" });
    expect(createTokenRequest).toHaveBeenCalledWith({
      clientId: "dev-1",
      capability: { "match:m1": ["subscribe", "presence"] },
      ttl: 60 * 60 * 1000,
    });

    await publishMatchUpdated("m1");
    expect(get).toHaveBeenCalledWith("match:m1");
    expect(publish).toHaveBeenCalledWith("updated", expect.objectContaining({ at: expect.any(Number) }));
  });
});
