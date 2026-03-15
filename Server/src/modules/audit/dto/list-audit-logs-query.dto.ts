import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class ListAuditLogsQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsIn(['GET', 'POST', 'PATCH', 'PUT', 'DELETE'])
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

  @IsOptional()
  @IsString()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsIn(['read', 'create', 'update', 'delete', 'other'])
  action?: 'read' | 'create' | 'update' | 'delete' | 'other';

  @IsOptional()
  @IsString()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  collection?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined) return undefined;
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    return value;
  })
  @IsBoolean()
  success?: boolean;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined) return undefined;
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    return value;
  })
  @IsBoolean()
  important?: boolean;

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
