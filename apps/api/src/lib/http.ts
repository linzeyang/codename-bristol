import type { ZodType } from 'zod';
import { HttpError } from '../db/types.js';

export function parse<T>(schema: ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
    throw new HttpError(400, '请求参数不合法', 'invalid_request', details);
  }
  return result.data;
}

export function notFound(message = '内容不存在'): never {
  throw new HttpError(404, message, 'not_found');
}

export function forbidden(message = '没有权限执行该操作'): never {
  throw new HttpError(403, message, 'forbidden');
}

export function unauthorized(message = '请先登录'): never {
  throw new HttpError(401, message, 'unauthorized');
}

export function conflict(message = '资源冲突'): never {
  throw new HttpError(409, message, 'conflict');
}