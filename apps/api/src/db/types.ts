export interface QueryResult<T> {
  rows: T[];
  rowCount: number;
}

export interface Db {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<QueryResult<T>>;
  transaction<T>(fn: (tx: Db) => Promise<T>): Promise<T>;
}

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code = 'request_failed',
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}