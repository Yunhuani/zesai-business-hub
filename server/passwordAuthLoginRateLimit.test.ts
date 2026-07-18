import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  compare: vi.fn(),
  sign: vi.fn(() => "test-token"),
  updates: [] as unknown[],
}));

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn(),
    compare: mocks.compare,
  },
}));

vi.mock("jsonwebtoken", () => ({
  default: {
    sign: mocks.sign,
  },
}));

vi.mock("./db", () => ({
  getDb: vi.fn(async () => ({
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => [{
            id: 7,
            openId: "email_user@example.com",
            email: "user@example.com",
            password: "hashed-password",
            loginCount: 2,
          }],
        }),
      }),
    }),
    update: () => ({
      set: (payload: unknown) => ({
        where: async () => {
          mocks.updates.push(payload);
        },
      }),
    }),
  })),
}));

describe("email password login failure limiting", () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    mocks.updates.length = 0;
    mocks.compare.mockResolvedValue(false);
  });

  it("locks an account for 15 minutes after five failed passwords", async () => {
    const { loginUserWithEmail } = await import("./passwordAuth");
    const email = "five-failures@example.com";

    for (let attempt = 1; attempt < 5; attempt++) {
      await expect(loginUserWithEmail(email, "wrong"))
        .rejects.toThrow("邮箱或密码错误");
    }
    await expect(loginUserWithEmail(email, "wrong"))
      .rejects.toThrow("尝试过多,请15分钟后再试");
    await expect(loginUserWithEmail(email, "correct"))
      .rejects.toThrow("尝试过多,请15分钟后再试");

    expect(mocks.compare).toHaveBeenCalledTimes(5);
  });

  it("allows login again after the 15-minute lock expires", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-18T00:00:00.000Z"));
    const { loginUserWithEmail } = await import("./passwordAuth");
    const email = "lock-expiry@example.com";

    for (let attempt = 1; attempt <= 5; attempt++) {
      await expect(loginUserWithEmail(email, "wrong")).rejects.toThrow();
    }

    mocks.compare.mockResolvedValue(true);
    await expect(loginUserWithEmail(email, "correct"))
      .rejects.toThrow("尝试过多,请15分钟后再试");

    vi.advanceTimersByTime(15 * 60 * 1000);

    await expect(loginUserWithEmail(email, "correct"))
      .resolves.toMatchObject({ token: "test-token" });
  });

  it("clears previous failures after a successful login", async () => {
    const { loginUserWithEmail } = await import("./passwordAuth");
    const email = "success-reset@example.com";

    for (let attempt = 1; attempt <= 4; attempt++) {
      await expect(loginUserWithEmail(email, "wrong"))
        .rejects.toThrow("邮箱或密码错误");
    }

    mocks.compare.mockResolvedValueOnce(true);
    await expect(loginUserWithEmail(email, "correct"))
      .resolves.toMatchObject({ token: "test-token" });

    mocks.compare.mockResolvedValue(false);
    for (let attempt = 1; attempt <= 4; attempt++) {
      await expect(loginUserWithEmail(email, "wrong-again"))
        .rejects.toThrow("邮箱或密码错误");
    }
    await expect(loginUserWithEmail(email, "wrong-again"))
      .rejects.toThrow("尝试过多,请15分钟后再试");
  });
});
