import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';

const trimValue = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateShippingAddressDto {
  @Transform(trimValue)
  @IsString()
  @Length(2, 40)
  label: string;

  @Transform(trimValue)
  @IsString()
  @Length(2, 120)
  recipientName: string;

  @Transform(trimValue)
  @Matches(/^\d{10,15}$/)
  phone: string;

  @Transform(trimValue)
  @IsString()
  @Length(2, 120)
  street: string;

  @Transform(trimValue)
  @IsString()
  @Length(1, 20)
  exteriorNumber: string;

  @Transform(trimValue)
  @IsOptional()
  @IsString()
  @Length(0, 20)
  interiorNumber?: string;

  @Transform(trimValue)
  @IsString()
  @Length(2, 100)
  neighborhood: string;

  @Transform(trimValue)
  @IsString()
  @Length(2, 100)
  municipality: string;

  @Transform(trimValue)
  @IsString()
  @Length(2, 100)
  state: string;

  @Transform(trimValue)
  @Matches(/^\d{5}$/)
  postalCode: string;

  @Transform(trimValue)
  @IsOptional()
  @IsString()
  @Length(0, 300)
  references?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
