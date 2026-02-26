import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    provider: {
      findUnique: vi.fn(),
    },
  },
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requireProviderAccess, requireSession } from "./api-auth";

describe("api-auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("requireSession", () => {
    it("已登录时返回 [session, null]", async () => {
      const session = { user: { id: "user-1" } };
      vi.mocked(auth).mockResolvedValue(session as Awaited<ReturnType<typeof auth>>);

      const [resultSession, errorResponse] = await requireSession();

      expect(resultSession).toEqual(session);
      expect(errorResponse).toBeNull();
    });

    it("未登录时返回 [null, 401 Response]", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const [resultSession, errorResponse] = await requireSession();

      expect(resultSession).toBeNull();
      expect(errorResponse).not.toBeNull();
      expect(errorResponse?.status).toBe(401);
      const body = await errorResponse?.json();
      expect(body.error).toBe("Unauthorized");
    });
  });

  describe("requireProviderAccess", () => {
    it("provider 存在时返回 [session, provider, null]", async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: "user-1" } } as Awaited<ReturnType<typeof auth>>);
      const mockProvider = {
        id: "provider-1",
        userId: "user-1",
        name: "P1",
      } as unknown as Awaited<ReturnType<typeof prisma.provider.findUnique>>;
      vi.mocked(prisma.provider.findUnique).mockResolvedValue(mockProvider);

      const [session, provider, errorResponse] = await requireProviderAccess("provider-1");

      expect(session).not.toBeNull();
      expect(provider).not.toBeNull();
      expect(provider?.id).toBe("provider-1");
      expect(errorResponse).toBeNull();
    });

    it("未登录时返回 [null, null, 401]", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const [session, provider, errorResponse] = await requireProviderAccess("provider-1");

      expect(session).toBeNull();
      expect(provider).toBeNull();
      expect(errorResponse).not.toBeNull();
      expect(errorResponse?.status).toBe(401);
    });

    it("provider 不存在时返回 [null, null, 404]", async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: "user-1" } } as Awaited<ReturnType<typeof auth>>);
      vi.mocked(prisma.provider.findUnique).mockResolvedValue(null);

      const [session, provider, errorResponse] = await requireProviderAccess("missing-provider");

      expect(session).toBeNull();
      expect(provider).toBeNull();
      expect(errorResponse).not.toBeNull();
      expect(errorResponse?.status).toBe(404);
      const body = await errorResponse?.json();
      expect(body.error).toBe("Provider 不存在");
    });

    it("provider 属于其他用户时返回 [null, null, 403]", async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: "user-1" } } as Awaited<ReturnType<typeof auth>>);
      const mockProvider = {
        id: "provider-1",
        userId: "user-2",
      } as unknown as Awaited<ReturnType<typeof prisma.provider.findUnique>>;
      vi.mocked(prisma.provider.findUnique).mockResolvedValue(mockProvider);

      const [session, provider, errorResponse] = await requireProviderAccess("provider-1");

      expect(session).toBeNull();
      expect(provider).toBeNull();
      expect(errorResponse).not.toBeNull();
      expect(errorResponse?.status).toBe(403);
      const body = await errorResponse?.json();
      expect(body.error).toBe("无权访问该资源");
    });
  });
});
