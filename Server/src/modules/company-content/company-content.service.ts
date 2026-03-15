import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DEFAULT_COMPANY_CONTENT } from './data/default-company-content';
import { UpdateCompanyContentDto } from './dto/update-company-content.dto';
import {
  CompanyContent,
  CompanyContentDocument,
} from './schemas/company-content.schema';

const MAIN_CONTENT_KEY = 'main';

export interface CompanyContentResponse {
  privacyPolicy: {
    title: string;
    content: string;
  };
  termsAndConditions: {
    title: string;
    content: string;
  };
  about: {
    mission: string;
    vision: string;
    values: string[];
  };
  createdAt?: string;
  updatedAt?: string;
}

@Injectable()
export class CompanyContentService {
  constructor(
    @InjectModel(CompanyContent.name)
    private readonly companyContentModel: Model<CompanyContentDocument>,
  ) {}

  async getPublicContent(): Promise<CompanyContentResponse> {
    const document = await this.getOrCreateMainContent();
    return this.toResponse(document);
  }

  async getAdminContent(): Promise<CompanyContentResponse> {
    const document = await this.getOrCreateMainContent();
    return this.toResponse(document);
  }

  async updateContent(
    payload: UpdateCompanyContentDto,
  ): Promise<CompanyContentResponse> {
    const document = await this.getOrCreateMainContent();
    const updatePayload: Record<string, unknown> = {};

    if (payload.privacyPolicy) {
      const title = this.normalizeOptionalString(payload.privacyPolicy.title);
      const content = this.normalizeOptionalString(payload.privacyPolicy.content);

      if (title !== undefined) updatePayload['privacyPolicy.title'] = title;
      if (content !== undefined) updatePayload['privacyPolicy.content'] = content;
    }

    if (payload.termsAndConditions) {
      const title = this.normalizeOptionalString(
        payload.termsAndConditions.title,
      );
      const content = this.normalizeOptionalString(
        payload.termsAndConditions.content,
      );

      if (title !== undefined) updatePayload['termsAndConditions.title'] = title;
      if (content !== undefined) {
        updatePayload['termsAndConditions.content'] = content;
      }
    }

    if (payload.about) {
      const mission = this.normalizeOptionalString(payload.about.mission);
      const vision = this.normalizeOptionalString(payload.about.vision);

      if (mission !== undefined) updatePayload['about.mission'] = mission;
      if (vision !== undefined) updatePayload['about.vision'] = vision;

      if (payload.about.values !== undefined) {
        updatePayload['about.values'] = this.normalizeStringArray(
          payload.about.values,
        );
      }
    }

    if (Object.keys(updatePayload).length === 0) {
      throw new BadRequestException('At least one field must be updated');
    }

    const updatedDocument = await this.companyContentModel
      .findByIdAndUpdate(document.id, { $set: updatePayload }, {
        returnDocument: 'after',
        runValidators: true,
      })
      .exec();

    if (!updatedDocument) {
      throw new BadRequestException('Company content not found');
    }

    return this.toResponse(updatedDocument);
  }

  private async getOrCreateMainContent(): Promise<CompanyContentDocument> {
    const existing = await this.companyContentModel
      .findOne({ key: MAIN_CONTENT_KEY })
      .exec();

    if (existing) {
      return existing;
    }

    const created = new this.companyContentModel({
      key: MAIN_CONTENT_KEY,
      ...DEFAULT_COMPANY_CONTENT,
    });

    return created.save();
  }

  private normalizeOptionalString(value?: string): string | undefined {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  private normalizeStringArray(values: string[]): string[] {
    return [
      ...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0)),
    ];
  }

  private toResponse(document: CompanyContentDocument): CompanyContentResponse {
    return {
      privacyPolicy: {
        title: document.privacyPolicy?.title ?? '',
        content: document.privacyPolicy?.content ?? '',
      },
      termsAndConditions: {
        title: document.termsAndConditions?.title ?? '',
        content: document.termsAndConditions?.content ?? '',
      },
      about: {
        mission: document.about?.mission ?? '',
        vision: document.about?.vision ?? '',
        values: document.about?.values ?? [],
      },
      createdAt: document.createdAt?.toISOString(),
      updatedAt: document.updatedAt?.toISOString(),
    };
  }
}
