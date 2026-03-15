import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Response } from 'express';
import { Observable, catchError, tap, throwError } from 'rxjs';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';
import { AuditService } from './audit.service';

const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'token',
  'accesstoken',
  'refreshtoken',
  'authorization',
  'pwd',
]);

function safeString(value: unknown, maxLength = 350): string {
  if (typeof value !== 'string') return '';
  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
}

function sanitizeValue(
  value: unknown,
  depth = 0,
  seen: WeakSet<object> = new WeakSet(),
): unknown {
  if (value === null || value === undefined) return value;
  if (depth > 5) return '[MaxDepth]';

  if (typeof value === 'string') return safeString(value);
  if (typeof value === 'number' || typeof value === 'boolean') return value;

  if (Array.isArray(value)) {
    return value.slice(0, 25).map((item) => sanitizeValue(item, depth + 1, seen));
  }

  if (typeof value !== 'object') {
    return String(value);
  }

  if (seen.has(value as object)) {
    return '[Circular]';
  }
  seen.add(value as object);

  const output: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      output[key] = '[REDACTED]';
      continue;
    }
    output[key] = sanitizeValue(raw, depth + 1, seen);
  }

  return output;
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const response = context.switchToHttp().getResponse<Response>();
    const path = request.originalUrl ?? request.url ?? '';

    if (!this.shouldAudit(path)) {
      return next.handle();
    }

    const startedAt = Date.now();
    const method = (request.method ?? 'GET').toUpperCase();
    const route = this.resolveRoute(request, path);
    const collection = this.auditService.resolveCollectionFromPath(path);
    const action = this.auditService.resolveActionFromMethod(method);
    const actorUserId = request.user?.sub;
    const actorEmail = request.user?.email;
    const actorRole = request.user?.role;
    const resourceId = this.resolveResourceId(request.params);
    const requestQuery = sanitizeValue(request.query) as Record<string, unknown>;
    const requestBody =
      method === 'GET' || method === 'HEAD'
        ? undefined
        : (sanitizeValue(request.body) as Record<string, unknown>);
    const ip = safeString(request.ip ?? '');
    const userAgent = safeString(request.headers['user-agent'] ?? '', 500);

    return next.handle().pipe(
      tap(() => {
        this.saveLog({
          actorUserId,
          actorEmail,
          actorRole,
          method,
          route,
          action,
          collection,
          resourceId,
          statusCode: response.statusCode ?? 200,
          success: true,
          responseTimeMs: Date.now() - startedAt,
          ip,
          userAgent,
          requestQuery,
          requestBody,
        });
      }),
      catchError((error: unknown) => {
        const statusCode = this.resolveStatusCode(error);
        const errorMessage = this.resolveErrorMessage(error);

        this.saveLog({
          actorUserId,
          actorEmail,
          actorRole,
          method,
          route,
          action,
          collection,
          resourceId,
          statusCode,
          success: false,
          errorMessage,
          responseTimeMs: Date.now() - startedAt,
          ip,
          userAgent,
          requestQuery,
          requestBody,
        });

        return throwError(() => error);
      }),
    );
  }

  private shouldAudit(path: string): boolean {
    if (!path.startsWith('/api/admin')) {
      return false;
    }
    return !path.startsWith('/api/admin/audit');
  }

  private resolveRoute(request: AuthenticatedRequest, path: string): string {
    const baseUrl = request.baseUrl ?? '';
    const routePath = request.route?.path ?? '';
    if (routePath) return `${baseUrl}${routePath}`;
    return path.split('?')[0];
  }

  private resolveResourceId(
    params: Record<string, string | string[]> = {},
  ): string | undefined {
    const values = Object.values(params);
    if (values.length === 0) return undefined;
    const firstValue = values[0];
    if (Array.isArray(firstValue)) return firstValue[0];
    return firstValue;
  }

  private resolveStatusCode(error: unknown): number {
    if (typeof error === 'object' && error && 'status' in error) {
      const value = (error as { status?: unknown }).status;
      if (typeof value === 'number') return value;
    }
    return 500;
  }

  private resolveErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return safeString(error.message, 1000);
    }
    return 'Error no controlado';
  }

  private saveLog(payload: Parameters<AuditService['createLog']>[0]): void {
    void this.auditService.createLog(payload).catch(() => undefined);
  }
}
