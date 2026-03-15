import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

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

  createdAt?: Date;
  updatedAt?: Date;
}

export const CompanyContentSchema = SchemaFactory.createForClass(CompanyContent);
