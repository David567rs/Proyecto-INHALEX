import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { NotificationsService } from '../notifications/notifications.service';
import {
  CustomerNotificationSeverity,
  CustomerNotificationType,
} from '../notifications/schemas/customer-notification.schema';
import { UsersService } from '../users/users.service';
import { CreateCustomerReportDto } from './dto/create-customer-report.dto';
import { ListAdminReportsQueryDto } from './dto/list-admin-reports-query.dto';
import { UpdateCustomerReportDto } from './dto/update-customer-report.dto';
import {
  CustomerReport,
  CustomerReportDocument,
  CustomerReportPriority,
  CustomerReportStatus,
  CustomerReportType,
} from './schemas/customer-report.schema';

export interface CustomerReportResponse {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  type: CustomerReportType;
  title: string;
  message: string;
  orderReference?: string;
  productId?: string;
  status: CustomerReportStatus;
  priority: CustomerReportPriority;
  adminNote?: string;
  handledById?: string;
  handledByEmail?: string;
  resolvedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminReportsResponse {
  items: CustomerReportResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  summary: Record<CustomerReportStatus, number>;
}

const STATUS_LABELS: Record<CustomerReportStatus, string> = {
  [CustomerReportStatus.NEW]: 'nuevo',
  [CustomerReportStatus.IN_REVIEW]: 'en revision',
  [CustomerReportStatus.RESOLVED]: 'resuelto',
  [CustomerReportStatus.CLOSED]: 'cerrado',
};

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(CustomerReport.name)
    private readonly customerReportModel: Model<CustomerReportDocument>,
    private readonly usersService: UsersService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(
    user: JwtPayload,
    createCustomerReportDto: CreateCustomerReportDto,
  ): Promise<CustomerReportResponse> {
    const userName = await this.resolveUserName(user);
    const report = await this.customerReportModel.create({
      userId: user.sub,
      userEmail: user.email.trim().toLowerCase(),
      userName,
      type: createCustomerReportDto.type,
      title: createCustomerReportDto.title.trim(),
      message: createCustomerReportDto.message.trim(),
      orderReference:
        createCustomerReportDto.orderReference?.trim().toUpperCase() ||
        undefined,
      productId: createCustomerReportDto.productId,
      priority:
        createCustomerReportDto.priority ?? CustomerReportPriority.NORMAL,
      status: CustomerReportStatus.NEW,
    });

    await this.notificationsService.createForUser({
      userId: user.sub,
      userEmail: user.email,
      title: 'Reporte recibido',
      message: `Tu reporte "${report.title}" ya esta en la bandeja del equipo.`,
      type: CustomerNotificationType.REPORT,
      severity: CustomerNotificationSeverity.INFO,
      metadata: { reportId: report.id },
    });

    return this.mapReport(report);
  }

  async listForUser(user: JwtPayload): Promise<CustomerReportResponse[]> {
    const reports = await this.customerReportModel
      .find(this.buildUserFilters(user))
      .sort({ createdAt: -1 })
      .limit(20)
      .exec();

    return reports.map((report) => this.mapReport(report));
  }

  async listAdmin(
    query: ListAdminReportsQueryDto,
  ): Promise<AdminReportsResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 12;
    const skip = (page - 1) * limit;
    const filters = this.buildAdminFilters(query);

    const [items, total, statusCounts] = await Promise.all([
      this.customerReportModel
        .find(filters)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.customerReportModel.countDocuments(filters).exec(),
      this.customerReportModel.aggregate<{
        _id: CustomerReportStatus;
        count: number;
      }>([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const countsByStatus = new Map(
      statusCounts.map((item) => [item._id, item.count]),
    );

    return {
      items: items.map((report) => this.mapReport(report)),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      summary: {
        [CustomerReportStatus.NEW]:
          countsByStatus.get(CustomerReportStatus.NEW) ?? 0,
        [CustomerReportStatus.IN_REVIEW]:
          countsByStatus.get(CustomerReportStatus.IN_REVIEW) ?? 0,
        [CustomerReportStatus.RESOLVED]:
          countsByStatus.get(CustomerReportStatus.RESOLVED) ?? 0,
        [CustomerReportStatus.CLOSED]:
          countsByStatus.get(CustomerReportStatus.CLOSED) ?? 0,
      },
    };
  }

  async updateAdmin(
    reportId: string,
    updateCustomerReportDto: UpdateCustomerReportDto,
    actor: JwtPayload,
  ): Promise<CustomerReportResponse> {
    if (!Types.ObjectId.isValid(reportId)) {
      throw new BadRequestException('Invalid report id');
    }

    if (
      updateCustomerReportDto.status === undefined &&
      updateCustomerReportDto.priority === undefined &&
      updateCustomerReportDto.adminNote === undefined
    ) {
      throw new BadRequestException('At least one field must be updated');
    }

    const updatePayload: Partial<CustomerReport> = {
      handledById: actor.sub,
      handledByEmail: actor.email,
    };

    if (updateCustomerReportDto.status !== undefined) {
      updatePayload.status = updateCustomerReportDto.status;
      updatePayload.resolvedAt = [
        CustomerReportStatus.RESOLVED,
        CustomerReportStatus.CLOSED,
      ].includes(updateCustomerReportDto.status)
        ? new Date()
        : undefined;
    }

    if (updateCustomerReportDto.priority !== undefined) {
      updatePayload.priority = updateCustomerReportDto.priority;
    }

    if (updateCustomerReportDto.adminNote !== undefined) {
      updatePayload.adminNote =
        updateCustomerReportDto.adminNote.trim() || undefined;
    }

    const report = await this.customerReportModel
      .findByIdAndUpdate(
        reportId,
        { $set: updatePayload },
        { returnDocument: 'after', runValidators: true },
      )
      .exec();

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    await this.notificationsService.createForUser({
      userId: report.userId,
      userEmail: report.userEmail,
      title: 'Reporte actualizado',
      message: `Tu reporte "${report.title}" esta ${STATUS_LABELS[report.status]}.`,
      type: CustomerNotificationType.REPORT,
      severity:
        report.status === CustomerReportStatus.RESOLVED
          ? CustomerNotificationSeverity.SUCCESS
          : CustomerNotificationSeverity.INFO,
      metadata: {
        reportId: report.id,
        status: report.status,
      },
    });

    return this.mapReport(report);
  }

  private buildUserFilters(user: JwtPayload) {
    return {
      $or: [
        { userId: user.sub },
        { userEmail: user.email.trim().toLowerCase() },
      ],
    };
  }

  private buildAdminFilters(
    query: ListAdminReportsQueryDto,
  ): Record<string, unknown> {
    const filters: Record<string, unknown> = {};

    if (query.status) {
      filters.status = query.status;
    }

    if (query.type) {
      filters.type = query.type;
    }

    if (query.search?.trim()) {
      const regex = new RegExp(query.search.trim(), 'i');
      filters.$or = [
        { title: regex },
        { message: regex },
        { userName: regex },
        { userEmail: regex },
        { orderReference: regex },
      ];
    }

    return filters;
  }

  private async resolveUserName(user: JwtPayload): Promise<string> {
    const storedUser = await this.usersService.findById(user.sub);
    return storedUser?.name?.trim() || user.email.split('@')[0] || 'Cliente';
  }

  private mapReport(report: CustomerReportDocument): CustomerReportResponse {
    return {
      id: report.id,
      userId: report.userId,
      userEmail: report.userEmail,
      userName: report.userName,
      type: report.type,
      title: report.title,
      message: report.message,
      orderReference: report.orderReference,
      productId: report.productId,
      status: report.status,
      priority: report.priority,
      adminNote: report.adminNote,
      handledById: report.handledById,
      handledByEmail: report.handledByEmail,
      resolvedAt: report.resolvedAt?.toISOString(),
      createdAt: report.createdAt?.toISOString(),
      updatedAt: report.updatedAt?.toISOString(),
    };
  }
}
