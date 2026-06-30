import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { DEFAULT_COMPANY_CONTENT } from '../data/default-company-content';

export type CompanyContentDocument = HydratedDocument<CompanyContent>;

@Schema({ _id: false, versionKey: false })
export class CompanyTextSection {
  @Prop({ required: true, trim: true, maxlength: 160 })
  title: string;

  @Prop({ required: true, trim: true, maxlength: 60000 })
  content: string;
}

export const CompanyTextSectionSchema =
  SchemaFactory.createForClass(CompanyTextSection);

@Schema({ _id: false, versionKey: false })
export class AboutCompanySection {
  @Prop({ required: true, trim: true, maxlength: 5000 })
  mission: string;

  @Prop({ required: true, trim: true, maxlength: 5000 })
  vision: string;

  @Prop({ type: [String], default: [] })
  values: string[];
}

export const AboutCompanySectionSchema =
  SchemaFactory.createForClass(AboutCompanySection);

@Schema({ _id: false, versionKey: false })
export class CompanyFaqItem {
  @Prop({ required: true, trim: true, minlength: 5, maxlength: 240 })
  question: string;

  @Prop({ required: true, trim: true, minlength: 10, maxlength: 2000 })
  answer: string;
}

export const CompanyFaqItemSchema =
  SchemaFactory.createForClass(CompanyFaqItem);

@Schema({
  timestamps: true,
  versionKey: false,
  collection: 'contenidos_empresa',
})
export class CompanyContent {
  @Prop({
    required: true,
    unique: true,
    index: true,
    trim: true,
    default: 'main',
  })
  key: string;

  @Prop({ type: CompanyTextSectionSchema, required: true })
  privacyPolicy: CompanyTextSection;

  @Prop({ type: CompanyTextSectionSchema, required: true })
  termsAndConditions: CompanyTextSection;

  @Prop({ type: AboutCompanySectionSchema, required: true })
  about: AboutCompanySection;

  @Prop({
    type: [CompanyFaqItemSchema],
    default: () => DEFAULT_COMPANY_CONTENT.faqs.map((faq) => ({ ...faq })),
  })
  faqs: CompanyFaqItem[];

  createdAt?: Date;
  updatedAt?: Date;
}

export const CompanyContentSchema = SchemaFactory.createForClass(CompanyContent);
