import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import dotenv from 'dotenv';

for (const candidate of ['.env', '../../.env']) {
  if (existsSync(candidate)) {
    dotenv.config({ path: candidate, quiet: true });
    break;
  }
}

export interface LlmConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  timeoutMs: number;
}

export interface Config {
  nodeEnv: string;
  port: number;
  databaseUrl: string;
  jwtSecret: string;
  cookieSecure: boolean;
  allowedOrigins: string[];
  seedOnEmpty: boolean;
  mediaDir: string;
  rateLimitMax: number;
  llm: LlmConfig | null;
}

function bool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === '') return fallback;
  return value === 'true' || value === '1';
}

function resolveMediaDir(): string {
  const candidates = [
    resolve(process.cwd(), 'media'),
    resolve(process.cwd(), 'apps/api/media'),
  ];
  return candidates.find((p) => existsSync(p)) ?? candidates[0]!;
}

export function loadConfig(overrides: Partial<Config> = {}): Config {
  const env = process.env;
  let jwtSecret = env.JWT_SECRET?.trim() ?? '';
  if (!jwtSecret) {
    if (env.NODE_ENV === 'production') {
      console.warn('[声屿] 警告：未设置 JWT_SECRET，已生成临时密钥。生产环境必须通过环境变量注入，否则重启会使所有会话失效。');
    }
    jwtSecret = randomBytes(48).toString('base64url');
  }

  const llmBase = env.LLM_BASE_URL?.trim() ?? '';
  const llmKey = env.LLM_API_KEY?.trim() ?? '';
  const llmModel = env.LLM_MODEL?.trim() ?? '';

  const config: Config = {
    nodeEnv: env.NODE_ENV ?? 'development',
    port: Number(env.PORT ?? 3001),
    databaseUrl: env.DATABASE_URL ?? 'postgres://postgres@localhost:5432/shengyu',
    jwtSecret,
    cookieSecure: bool(env.COOKIE_SECURE, false),
    allowedOrigins: (env.ALLOWED_ORIGINS ?? 'http://localhost:5173,http://localhost:8080')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    seedOnEmpty: bool(env.SEED_ON_EMPTY, true),
    mediaDir: resolveMediaDir(),
    rateLimitMax: Number(env.RATE_LIMIT_MAX ?? 300),
    llm: llmBase && llmKey && llmModel
      ? {
          baseUrl: llmBase.replace(/\/+$/, ''),
          apiKey: llmKey,
          model: llmModel,
          timeoutMs: Number(env.LLM_TIMEOUT_MS ?? 8000),
        }
      : null,
  };
  return { ...config, ...overrides };
}