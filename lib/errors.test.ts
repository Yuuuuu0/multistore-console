import { describe, expect, it } from "vitest";

import {
  AppError,
  ForbiddenError,
  NotFoundError,
  RateLimitError,
  ValidationError,
  toErrorMessage,
  toErrorStatus,
} from "./errors";

describe("errors", () => {
  it("AppError 正确保存 message、statusCode、code", () => {
    const error = new AppError("boom", 418, "TEAPOT");

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe("boom");
    expect(error.statusCode).toBe(418);
    expect(error.code).toBe("TEAPOT");
  });

  it("NotFoundError 默认使用 404 和 NOT_FOUND", () => {
    const error = new NotFoundError();

    expect(error.statusCode).toBe(404);
    expect(error.code).toBe("NOT_FOUND");
  });

  it("ForbiddenError 默认使用 403 和 FORBIDDEN", () => {
    const error = new ForbiddenError();

    expect(error.statusCode).toBe(403);
    expect(error.code).toBe("FORBIDDEN");
  });

  it("ValidationError 使用 400 并保留自定义消息", () => {
    const error = new ValidationError("参数错误");

    expect(error.statusCode).toBe(400);
    expect(error.message).toBe("参数错误");
  });

  it("RateLimitError 默认使用 429", () => {
    const error = new RateLimitError();

    expect(error.statusCode).toBe(429);
  });

  it("toErrorMessage: Error 实例返回 message", () => {
    expect(toErrorMessage(new Error("bad"))).toBe("bad");
  });

  it("toErrorMessage: string 直接返回", () => {
    expect(toErrorMessage("oops")).toBe("oops");
  });

  it("toErrorMessage: null/undefined/object 返回默认文案", () => {
    expect(toErrorMessage(null)).toBe("未知错误");
    expect(toErrorMessage(undefined)).toBe("未知错误");
    expect(toErrorMessage({ reason: "x" })).toBe("未知错误");
  });

  it("toErrorStatus: AppError 返回 statusCode", () => {
    expect(toErrorStatus(new AppError("bad", 422))).toBe(422);
  });

  it("toErrorStatus: 普通 Error 返回 500", () => {
    expect(toErrorStatus(new Error("boom"))).toBe(500);
  });

  it("toErrorStatus: 非 Error 返回 500", () => {
    expect(toErrorStatus("boom")).toBe(500);
    expect(toErrorStatus(null)).toBe(500);
  });
});
