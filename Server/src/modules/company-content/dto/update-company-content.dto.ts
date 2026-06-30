import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class UpdateCompanyTextSectionDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(60000)
  content?: string;
}

export class UpdateAboutCompanyDto {
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  mission?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  vision?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MinLength(2, { each: true })
  @MaxLength(80, { each: true })
  values?: string[];
}

export class UpdateCompanyFaqItemDto {
  @IsString()
  @MinLength(5)
  @MaxLength(240)
  question: string;

  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  answer: string;
}

export class UpdateCompanyContentDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateCompanyTextSectionDto)
  privacyPolicy?: UpdateCompanyTextSectionDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateCompanyTextSectionDto)
  termsAndConditions?: UpdateCompanyTextSectionDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateAboutCompanyDto)
  about?: UpdateAboutCompanyDto;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => UpdateCompanyFaqItemDto)
  faqs?: UpdateCompanyFaqItemDto[];
}
