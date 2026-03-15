import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ListAuditLogsQueryDto } from './dto/list-audit-logs-query.dto';
import { AuditLogDocument, AuditLogEntity } from './schemas/audit-log.schema';

export interface CreateAuditLogInput {
  actorUserId?: string;
  actorEmail?: string;
  actorRole?: string;
  method: string;
  route: string;
  action?: string;
  collection?: string;
  resourceId?: string;
  statusCode: number;
  success: boolean;
  errorMessage?: string;
  responseTimeMs?: number;
  ip?: string;
  userAgent?: string;
  requestQuery?: Record<string, unknown>;
  requestBody?: Record<string, unknown>;
}

const COLLECTION_BY_PREFIX: Array<{ prefix: string; collection: string }> = [
  { prefix: '/api/admin/users', collection: 'usuarios' },
  { prefix: '/api/admin/backups', collection: 'respaldos' },
  { prefix: '/api/admin/products/categories', collection: 'categorias_producto' },
  { prefix: '/api/admin/products', collection: 'productos' },
  { prefix: '/api/admin/company-content', collection: 'contenidos_empresa' },
];

@Injectable()
export class AuditService {
  constructor(
    @InjectModel(AuditLogEntity.name)
    private readonly auditLogModel: Model<AuditLogDocument>,
  ) {}

  resolveCollectionFromPath(path: string): string {
    for (const map of COLLECTION_BY_PREFIX) {
      if (path.startsWith(map.prefix)) {
        return map.collection;
      }
    }
    return 'sistema';
  }

  resolveActionFromMethod(method: string): string {
    switch (method.toUpperCase()) {
      case 'GET':
        return 'read';
      case 'POST':
        return 'create';
      case 'PATCH':
      case 'PUT':
        return 'update';
      case 'DELETE':
        return 'delete';
      default:
        return 'other';
    }
  }

  async createLog(payload: CreateAuditLogInput) {
    const action =
      payload.action ?? this.resolveActionFromMethod(payload.method ?? 'GET');
    const collection = payload.collection ?? this.resolveCollectionFromPath(payload.route);

    const created = await this.auditLogModel.create({
      ...payload,
      action,
      collection,
      method: payload.method.toUpperCase(),
    });

    return created.toJSON();
  }

  async listLogs(query: ListAuditLogsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const andFilters: Array<Record<string, unknown>> = [];
    const filters: Record<string, unknown> = {};

    if (query.search) {
      const pattern = new RegExp(query.search.trim(), 'i');
      andFilters.push({
        $or: [
          { actorEmail: pattern },
          { route: pattern },
          { collection: pattern },
          { errorMessage: pattern },
        ],
      });
    }

    if (query.method) filters.method = query.method;
    if (query.action) filters.action = query.action;
    if (query.collection) filters.collection = query.collection;
    if (query.success !== undefined) filters.success = query.success;

    if (Object.keys(filters).length > 0) {
      andFilters.push(filters);
    }

    if (query.important) {
      andFilters.push({
        $or: [
          { success: false },
          { action: 'create' },
          { action: 'update' },
          { action: 'delete' },
        ],
      });
    }

    const finalFilters =
      andFilters.length === 0
        ? {}
        : andFilters.length === 1
          ? andFilters[0]
          : { $and: andFilters };

    const [items, total] = await Promise.all([
      this.auditLogModel
        .find(finalFilters)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.auditLogModel.countDocuments(finalFilters),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));
    return {
      items,
      total,
      page,
      limit,
      totalPages,
    };
  }
}
