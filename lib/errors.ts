/**
 * 应用错误基类
 */
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class NotFoundError extends AppError {
  constructor(message = "资源不存在") {
    super(message, 404, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "没有权限执行此操作") {
    super(message, 403, "FORBIDDEN");
    this.name = "ForbiddenError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, "VALIDATION_ERROR");
    this.name = "ValidationError";
  }
}

export class RateLimitError extends AppError {
  constructor(message = "请求过于频繁，请稍后重试") {
    super(message, 429, "RATE_LIMITED");
    this.name = "RateLimitError";
  }
}

/**
 * 从 unknown 类型错误中安全提取错误消息
 * 替代 catch (e: any) { e.message } 模式
 */
export function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "未知错误";
}

/**
 * 从 unknown 错误中提取状态码
 */
export function toErrorStatus(error: unknown): number {
  if (error instanceof AppError) return error.statusCode;
  return 500;
}
