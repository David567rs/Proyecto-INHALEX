export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number | null = null,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get isUnauthorized(): boolean {
    return this.status === 401 || this.status === 403;
  }
}

export function getDisplayError(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
