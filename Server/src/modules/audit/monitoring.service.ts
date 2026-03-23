import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import * as os from 'os';
import { Connection, Model } from 'mongoose';
import { User, UserDocument } from '../users/schemas/user.schema';
import { GetMonitoringQueryDto } from './dto/get-monitoring-query.dto';
import { AuditLogDocument, AuditLogEntity } from './schemas/audit-log.schema';

type CollectionActivityLevel = 'hot' | 'warm' | 'idle';
type UserActivityLevel = 'online' | 'recent' | 'idle';

interface CollectionActivitySnapshot {
  totalRequests: number;
  reads: number;
  writes: number;
  failedRequests: number;
  avgResponseTimeMs: number;
  lastActivityAt?: Date;
}

interface UserActivitySnapshot {
  requestsLastWindow: number;
  failedRequests: number;
  avgResponseTimeMs: number;
  lastRoute?: string;
  lastSeenAt?: Date;
}

interface TimelineBucketRow {
  _id: Date;
  totalRequests: number;
  failedRequests: number;
  avgResponseTimeMs?: number;
}

const COLLECTION_ACTIVITY_ALIASES: Record<string, string[]> = {
  usuarios: ['usuarios'],
  productos: ['productos'],
  categorias_producto: ['categorias_producto'],
  contenidos_empresa: ['contenidos_empresa'],
  respaldos: ['configuracion_respaldos', 'respaldos_generados'],
  sistema: ['auditoria_acciones'],
};

const EMPTY_COLLECTION_ACTIVITY: CollectionActivitySnapshot = {
  totalRequests: 0,
  reads: 0,
  writes: 0,
  failedRequests: 0,
  avgResponseTimeMs: 0,
};

function asNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function roundMetric(value: number, digits = 1): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function normalizeDate(value: unknown): Date | undefined {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return undefined;
}

function isoOrUndefined(value?: Date): string | undefined {
  return value ? value.toISOString() : undefined;
}

function resolveCollectionActivityLevel(
  activity: CollectionActivitySnapshot,
  now: Date,
): CollectionActivityLevel {
  const lastActivityAt = activity.lastActivityAt?.getTime() ?? 0;
  const ageMinutes = lastActivityAt
    ? (now.getTime() - lastActivityAt) / (60 * 1000)
    : Number.POSITIVE_INFINITY;

  if (activity.totalRequests >= 12 || ageMinutes <= 10) {
    return 'hot';
  }

  if (activity.totalRequests > 0 || ageMinutes <= 60) {
    return 'warm';
  }

  return 'idle';
}

function resolveUserActivityLevel(
  lastSeenAt: Date | undefined,
  now: Date,
): UserActivityLevel {
  if (!lastSeenAt) return 'idle';

  const ageMinutes = (now.getTime() - lastSeenAt.getTime()) / (60 * 1000);
  if (ageMinutes <= 5) return 'online';
  if (ageMinutes <= 60) return 'recent';
  return 'idle';
}

function resolveBucketMinutes(windowMinutes: number): number {
  if (windowMinutes <= 60) return 5;
  if (windowMinutes <= 360) return 15;
  return 60;
}

@Injectable()
export class MonitoringService {
  private lastCpuUsage = process.cpuUsage();
  private lastCpuTimestampNs = process.hrtime.bigint();

  constructor(
    @InjectConnection()
    private readonly connection: Connection,
    @InjectModel(AuditLogEntity.name)
    private readonly auditLogModel: Model<AuditLogDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async getOverview(query: GetMonitoringQueryDto) {
    const windowMinutes = query.windowMinutes ?? 60;
    const topCollections = query.topCollections ?? 8;
    const now = new Date();
    const windowStart = new Date(now.getTime() - windowMinutes * 60 * 1000);
    const bucketMinutes = resolveBucketMinutes(windowMinutes);

    const collectionNames = await this.listAuthorizedCollections();
    const [trafficMetrics, userMetrics, databaseMetrics, runtimeMetrics] =
      await Promise.all([
        this.buildTrafficMetrics(windowStart, now, bucketMinutes),
        this.buildUserMetrics(windowStart, now),
        this.buildDatabaseMetrics(collectionNames, windowStart, now),
        Promise.resolve(this.buildRuntimeMetrics()),
      ]);

    return {
      generatedAt: now.toISOString(),
      windowMinutes,
      bucketMinutes,
      database: databaseMetrics.database,
      collections: databaseMetrics.collections.slice(0, Math.max(3, topCollections)),
      traffic: trafficMetrics,
      users: userMetrics,
      runtime: runtimeMetrics,
    };
  }

  private async buildTrafficMetrics(
    windowStart: Date,
    now: Date,
    bucketMinutes: number,
  ) {
    const bucketMs = bucketMinutes * 60 * 1000;

    const [summaryRows, timelineRows, methodRows, actionRows, routeRows] =
      await Promise.all([
        this.auditLogModel
          .aggregate<
            {
              _id: null;
              totalRequests: number;
              failedRequests: number;
              avgResponseTimeMs?: number;
            }
          >([
            { $match: { createdAt: { $gte: windowStart } } },
            {
              $group: {
                _id: null,
                totalRequests: { $sum: 1 },
                failedRequests: {
                  $sum: {
                    $cond: [{ $eq: ['$success', false] }, 1, 0],
                  },
                },
                avgResponseTimeMs: { $avg: '$responseTimeMs' },
              },
            },
          ])
          .exec(),
        this.auditLogModel
          .aggregate<TimelineBucketRow>([
            { $match: { createdAt: { $gte: windowStart } } },
            {
              $group: {
                _id: {
                  $toDate: {
                    $subtract: [
                      { $toLong: '$createdAt' },
                      {
                        $mod: [{ $toLong: '$createdAt' }, bucketMs],
                      },
                    ],
                  },
                },
                totalRequests: { $sum: 1 },
                failedRequests: {
                  $sum: {
                    $cond: [{ $eq: ['$success', false] }, 1, 0],
                  },
                },
                avgResponseTimeMs: { $avg: '$responseTimeMs' },
              },
            },
            { $sort: { _id: 1 } },
          ])
          .exec(),
        this.auditLogModel
          .aggregate<{ _id: string; value: number }>([
            { $match: { createdAt: { $gte: windowStart } } },
            { $group: { _id: '$method', value: { $sum: 1 } } },
            { $sort: { value: -1, _id: 1 } },
          ])
          .exec(),
        this.auditLogModel
          .aggregate<{ _id: string; value: number }>([
            { $match: { createdAt: { $gte: windowStart } } },
            { $group: { _id: '$action', value: { $sum: 1 } } },
            { $sort: { value: -1, _id: 1 } },
          ])
          .exec(),
        this.auditLogModel
          .aggregate<
            {
              _id: string;
              totalRequests: number;
              failedRequests: number;
              avgResponseTimeMs?: number;
              lastSeenAt?: Date;
            }
          >([
            { $match: { createdAt: { $gte: windowStart } } },
            { $sort: { createdAt: -1 } },
            {
              $group: {
                _id: '$route',
                totalRequests: { $sum: 1 },
                failedRequests: {
                  $sum: {
                    $cond: [{ $eq: ['$success', false] }, 1, 0],
                  },
                },
                avgResponseTimeMs: { $avg: '$responseTimeMs' },
                lastSeenAt: { $max: '$createdAt' },
              },
            },
            { $sort: { totalRequests: -1, _id: 1 } },
            { $limit: 5 },
          ])
          .exec(),
      ]);

    const summary = summaryRows[0];
    const timeline = this.fillTimelineGaps({
      raw: timelineRows,
      bucketMinutes,
      windowStart,
      now,
    });

    return {
      totalRequests: summary?.totalRequests ?? 0,
      failedRequests: summary?.failedRequests ?? 0,
      successRate:
        summary && summary.totalRequests > 0
          ? roundMetric(
              ((summary.totalRequests - (summary.failedRequests ?? 0)) /
                summary.totalRequests) *
                100,
              1,
            )
          : 100,
      avgResponseTimeMs: roundMetric(summary?.avgResponseTimeMs ?? 0, 1),
      timeline,
      methods: methodRows.map((item) => ({
        key: item._id || 'UNKNOWN',
        value: item.value,
      })),
      actions: actionRows.map((item) => ({
        key: item._id || 'other',
        value: item.value,
      })),
      topRoutes: routeRows.map((item) => ({
        route: item._id || '/desconocida',
        totalRequests: item.totalRequests,
        failedRequests: item.failedRequests,
        avgResponseTimeMs: roundMetric(item.avgResponseTimeMs ?? 0, 1),
        lastSeenAt: isoOrUndefined(normalizeDate(item.lastSeenAt)),
      })),
    };
  }

  private async buildUserMetrics(windowStart: Date, now: Date) {
    const active5Minutes = new Date(now.getTime() - 5 * 60 * 1000);
    const active60Minutes = new Date(now.getTime() - 60 * 60 * 1000);
    const recentRegistration = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [totalsRows, userActivityRows, recentUsers] = await Promise.all([
      this.userModel
        .aggregate<
          {
            _id: null;
            total: number;
            admins: number;
            inactive: number;
            activeLast5Minutes: number;
            activeLast60Minutes: number;
            recentlyRegistered: number;
          }
        >([
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              admins: {
                $sum: {
                  $cond: [{ $eq: ['$role', 'admin'] }, 1, 0],
                },
              },
              inactive: {
                $sum: {
                  $cond: [{ $eq: ['$status', 'inactive'] }, 1, 0],
                },
              },
              activeLast5Minutes: {
                $sum: {
                  $cond: [{ $gte: ['$lastSeenAt', active5Minutes] }, 1, 0],
                },
              },
              activeLast60Minutes: {
                $sum: {
                  $cond: [{ $gte: ['$lastSeenAt', active60Minutes] }, 1, 0],
                },
              },
              recentlyRegistered: {
                $sum: {
                  $cond: [{ $gte: ['$createdAt', recentRegistration] }, 1, 0],
                },
              },
            },
          },
        ])
        .exec(),
      this.auditLogModel
        .aggregate<
          {
            _id: string;
            requestsLastWindow: number;
            failedRequests: number;
            avgResponseTimeMs?: number;
            lastRoute?: string;
            lastSeenAt?: Date;
          }
        >([
          {
            $match: {
              createdAt: { $gte: windowStart },
              actorUserId: { $exists: true, $nin: ['', null] },
            },
          },
          { $sort: { createdAt: -1 } },
          {
            $group: {
              _id: '$actorUserId',
              requestsLastWindow: { $sum: 1 },
              failedRequests: {
                $sum: {
                  $cond: [{ $eq: ['$success', false] }, 1, 0],
                },
              },
              avgResponseTimeMs: { $avg: '$responseTimeMs' },
              lastRoute: { $first: '$route' },
              lastSeenAt: { $max: '$createdAt' },
            },
          },
          { $sort: { requestsLastWindow: -1, lastSeenAt: -1 } },
        ])
        .exec(),
      this.userModel
        .find()
        .sort({ lastSeenAt: -1, lastLoginAt: -1, createdAt: -1 })
        .limit(8)
        .lean()
        .exec(),
    ]);

    const totals = totalsRows[0] ?? {
      total: 0,
      admins: 0,
      inactive: 0,
      activeLast5Minutes: 0,
      activeLast60Minutes: 0,
      recentlyRegistered: 0,
    };
    const typedRecentUsers = recentUsers as Array<
      User & {
        _id: unknown;
        createdAt?: Date;
        lastSeenAt?: Date;
        lastLoginAt?: Date;
      }
    >;

    const userActivityMap = new Map<string, UserActivitySnapshot>();
    for (const item of userActivityRows) {
      userActivityMap.set(item._id, {
        requestsLastWindow: item.requestsLastWindow,
        failedRequests: item.failedRequests,
        avgResponseTimeMs: roundMetric(item.avgResponseTimeMs ?? 0, 1),
        lastRoute: item.lastRoute,
        lastSeenAt: normalizeDate(item.lastSeenAt),
      });
    }

    const spotlightUsers = typedRecentUsers.map((user) => {
      const activity = userActivityMap.get(String(user._id));
      const lastSeenAt = normalizeDate(user.lastSeenAt) ?? activity?.lastSeenAt;

      return {
        userId: String(user._id),
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        lastSeenAt: isoOrUndefined(lastSeenAt),
        lastLoginAt: isoOrUndefined(normalizeDate(user.lastLoginAt)),
        createdAt: isoOrUndefined(normalizeDate(user.createdAt)),
        requestsLastWindow: activity?.requestsLastWindow ?? 0,
        failedRequests: activity?.failedRequests ?? 0,
        avgResponseTimeMs: activity?.avgResponseTimeMs ?? 0,
        lastRoute: activity?.lastRoute,
        activityLevel: resolveUserActivityLevel(lastSeenAt, now),
      };
    });

    return {
      total: totals.total,
      admins: totals.admins,
      inactive: totals.inactive,
      activeLast5Minutes: totals.activeLast5Minutes,
      activeLast60Minutes: totals.activeLast60Minutes,
      recentlyRegistered: totals.recentlyRegistered,
      spotlightUsers,
    };
  }

  private async buildDatabaseMetrics(
    collectionNames: string[],
    windowStart: Date,
    now: Date,
  ) {
    const db = this.getDb();
    const capabilities = {
      dbStats: false,
      collStats: false,
      serverStatus: false,
    };
    const notes: string[] = [];

    let dbStats: Record<string, unknown> = {};
    try {
      dbStats = (await db.command({ dbStats: 1, scale: 1 })) as Record<
        string,
        unknown
      >;
      capabilities.dbStats = true;
    } catch {
      notes.push('No fue posible leer dbStats con las credenciales actuales.');
    }

    let serverStatus: Record<string, unknown> = {};
    try {
      serverStatus = (await db.admin().command({
        serverStatus: 1,
      })) as Record<string, unknown>;
      capabilities.serverStatus = true;
    } catch {
      notes.push(
        'Mongo serverStatus no esta disponible. Se muestran senales parciales del motor.',
      );
    }

    const collectionActivityMap = await this.loadCollectionActivityMap(windowStart);

    let usedCollStatsFallback = false;
    const rawCollections = await Promise.all(
      collectionNames.map(async (name) => {
        try {
          const stats = (await db.command({
            collStats: name,
            scale: 1,
          })) as Record<string, unknown>;
          capabilities.collStats = true;

          return {
            name,
            documents: asNumber(stats.count),
            avgObjSizeBytes: asNumber(stats.avgObjSize),
            dataSizeBytes: asNumber(stats.size),
            storageSizeBytes: asNumber(stats.storageSize),
            totalIndexSizeBytes: asNumber(stats.totalIndexSize),
            indexes: asNumber(stats.nindexes),
          };
        } catch {
          usedCollStatsFallback = true;
          const documents = await db.collection(name).countDocuments({});
          return {
            name,
            documents,
            avgObjSizeBytes: 0,
            dataSizeBytes: 0,
            storageSizeBytes: 0,
            totalIndexSizeBytes: 0,
            indexes: 0,
          };
        }
      }),
    );

    if (usedCollStatsFallback) {
      notes.push('Algunas metricas por coleccion se estimaron sin collStats.');
    }

    const totalStorage = rawCollections.reduce(
      (sum, item) => sum + item.storageSizeBytes,
      0,
    );
    const totalDocuments = rawCollections.reduce(
      (sum, item) => sum + item.documents,
      0,
    );

    const collections = rawCollections
      .map((item) => {
        const activity =
          collectionActivityMap.get(item.name) ?? EMPTY_COLLECTION_ACTIVITY;

        return {
          ...item,
          sizeSharePercent:
            totalStorage > 0
              ? roundMetric((item.storageSizeBytes / totalStorage) * 100, 1)
              : 0,
          documentSharePercent:
            totalDocuments > 0
              ? roundMetric((item.documents / totalDocuments) * 100, 1)
              : 0,
          totalRequests: activity.totalRequests,
          reads: activity.reads,
          writes: activity.writes,
          failedRequests: activity.failedRequests,
          avgResponseTimeMs: activity.avgResponseTimeMs,
          lastActivityAt: isoOrUndefined(activity.lastActivityAt),
          activityLevel: resolveCollectionActivityLevel(activity, now),
        };
      })
      .sort((a, b) => {
        if (b.storageSizeBytes !== a.storageSizeBytes) {
          return b.storageSizeBytes - a.storageSizeBytes;
        }
        return b.documents - a.documents;
      });

    const connections =
      typeof serverStatus.connections === 'object' && serverStatus.connections
        ? (serverStatus.connections as Record<string, unknown>)
        : {};
    const storageEngine =
      typeof serverStatus.storageEngine === 'object' && serverStatus.storageEngine
        ? (serverStatus.storageEngine as Record<string, unknown>)
        : {};
    const opcounters =
      typeof serverStatus.opcounters === 'object' && serverStatus.opcounters
        ? (serverStatus.opcounters as Record<string, unknown>)
        : {};
    const wiredTiger =
      typeof serverStatus.wiredTiger === 'object' && serverStatus.wiredTiger
        ? (serverStatus.wiredTiger as Record<string, unknown>)
        : {};
    const wiredTigerCache =
      typeof wiredTiger.cache === 'object' && wiredTiger.cache
        ? (wiredTiger.cache as Record<string, unknown>)
        : {};

    return {
      database: {
        name: db.databaseName,
        collections: asNumber(dbStats.collections) || collectionNames.length,
        objects: asNumber(dbStats.objects),
        dataSizeBytes: asNumber(dbStats.dataSize),
        storageSizeBytes: asNumber(dbStats.storageSize),
        indexSizeBytes: asNumber(dbStats.indexSize),
        indexes: asNumber(dbStats.indexes),
        avgObjSizeBytes: asNumber(dbStats.avgObjSize),
        activeConnections: asNumber(connections.current),
        availableConnections: asNumber(connections.available),
        uptimeSeconds: asNumber(serverStatus.uptime),
        engine: String(storageEngine.name ?? 'mongodb'),
        cacheUsedBytes: asNumber(
          wiredTigerCache['bytes currently in the cache'],
        ),
        cacheDirtyBytes: asNumber(
          wiredTigerCache['tracked dirty bytes in the cache'],
        ),
        cacheMaxBytes: asNumber(
          wiredTigerCache['maximum bytes configured'],
        ),
        operations: {
          insert: asNumber(opcounters.insert),
          query: asNumber(opcounters.query),
          update: asNumber(opcounters.update),
          delete: asNumber(opcounters.delete),
          getmore: asNumber(opcounters.getmore),
          command: asNumber(opcounters.command),
        },
        capabilities,
        notes,
      },
      collections,
    };
  }

  private buildRuntimeMetrics() {
    const memoryUsage = process.memoryUsage();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();

    return {
      hostname: os.hostname(),
      pid: process.pid,
      nodeVersion: process.version,
      platform: `${os.platform()} ${os.release()}`,
      cpuCount: os.cpus().length || 1,
      processUptimeSeconds: roundMetric(process.uptime(), 1),
      processCpuPercent: this.sampleProcessCpuPercent(),
      processMemoryBytes: {
        rss: memoryUsage.rss,
        heapTotal: memoryUsage.heapTotal,
        heapUsed: memoryUsage.heapUsed,
        external: memoryUsage.external,
        arrayBuffers: memoryUsage.arrayBuffers,
      },
      systemMemoryBytes: {
        total: totalMemory,
        free: freeMemory,
        used: totalMemory - freeMemory,
      },
    };
  }

  private async loadCollectionActivityMap(windowStart: Date) {
    const rows = await this.auditLogModel
      .aggregate<
        {
          _id: string;
          totalRequests: number;
          reads: number;
          writes: number;
          failedRequests: number;
          avgResponseTimeMs?: number;
          lastActivityAt?: Date;
        }
      >([
        { $match: { createdAt: { $gte: windowStart } } },
        {
          $group: {
            _id: '$collection',
            totalRequests: { $sum: 1 },
            reads: {
              $sum: {
                $cond: [{ $eq: ['$action', 'read'] }, 1, 0],
              },
            },
            writes: {
              $sum: {
                $cond: [
                  { $in: ['$action', ['create', 'update', 'delete']] },
                  1,
                  0,
                ],
              },
            },
            failedRequests: {
              $sum: {
                $cond: [{ $eq: ['$success', false] }, 1, 0],
              },
            },
            avgResponseTimeMs: { $avg: '$responseTimeMs' },
            lastActivityAt: { $max: '$createdAt' },
          },
        },
      ])
      .exec();

    const map = new Map<string, CollectionActivitySnapshot>();
    for (const row of rows) {
      const aliases = COLLECTION_ACTIVITY_ALIASES[row._id] ?? [row._id];
      for (const alias of aliases) {
        map.set(alias, {
          totalRequests: row.totalRequests,
          reads: row.reads,
          writes: row.writes,
          failedRequests: row.failedRequests,
          avgResponseTimeMs: roundMetric(row.avgResponseTimeMs ?? 0, 1),
          lastActivityAt: normalizeDate(row.lastActivityAt),
        });
      }
    }

    return map;
  }

  private fillTimelineGaps(options: {
    raw: TimelineBucketRow[];
    bucketMinutes: number;
    windowStart: Date;
    now: Date;
  }) {
    const { raw, bucketMinutes, windowStart, now } = options;
    const bucketMs = bucketMinutes * 60 * 1000;
    const normalizedStart = new Date(
      Math.floor(windowStart.getTime() / bucketMs) * bucketMs,
    );
    const normalizedEnd = new Date(
      Math.floor(now.getTime() / bucketMs) * bucketMs,
    );

    const rawMap = new Map<number, TimelineBucketRow>();
    for (const entry of raw) {
      rawMap.set(new Date(entry._id).getTime(), entry);
    }

    const items: Array<{
      bucketStart: string;
      totalRequests: number;
      failedRequests: number;
      avgResponseTimeMs: number;
    }> = [];

    for (
      let current = normalizedStart.getTime();
      current <= normalizedEnd.getTime();
      current += bucketMs
    ) {
      const rawEntry = rawMap.get(current);
      items.push({
        bucketStart: new Date(current).toISOString(),
        totalRequests: rawEntry?.totalRequests ?? 0,
        failedRequests: rawEntry?.failedRequests ?? 0,
        avgResponseTimeMs: roundMetric(rawEntry?.avgResponseTimeMs ?? 0, 1),
      });
    }

    return items;
  }

  private sampleProcessCpuPercent(): number {
    const nextUsage = process.cpuUsage();
    const nextTimestampNs = process.hrtime.bigint();
    const elapsedMicros = Number(nextTimestampNs - this.lastCpuTimestampNs) / 1000;
    const usedMicros =
      nextUsage.user -
      this.lastCpuUsage.user +
      (nextUsage.system - this.lastCpuUsage.system);

    this.lastCpuUsage = nextUsage;
    this.lastCpuTimestampNs = nextTimestampNs;

    if (elapsedMicros <= 0) return 0;
    return roundMetric(Math.max(0, (usedMicros / elapsedMicros) * 100), 1);
  }

  private async listAuthorizedCollections(): Promise<string[]> {
    const db = this.getDb();
    const rawCollections = await db
      .listCollections(
        {},
        {
          nameOnly: true,
          authorizedCollections: true,
        },
      )
      .toArray();

    return rawCollections
      .map((entry) => entry.name)
      .filter((name) => !name.startsWith('system.'))
      .sort((a, b) => a.localeCompare(b, 'es-MX'));
  }

  private getDb() {
    const db = this.connection.db;
    if (!db) {
      throw new InternalServerErrorException(
        'No hay conexion activa con la base de datos',
      );
    }
    return db;
  }
}
