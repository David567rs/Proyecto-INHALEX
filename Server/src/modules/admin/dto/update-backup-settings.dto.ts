import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateBackupSettingsDto {
  @IsOptional()
  @IsBoolean()
  automaticEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(10080)
  rpoMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(1440)
  rtoMinutes?: number;

  @IsOptional()
  @IsString()
  @IsIn(['database', 'selectedCollections'])
  backupScope?: 'database' | 'selectedCollections';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  selectedCollections?: string[];

  @IsOptional()
  @IsString()
  @IsIn(['local', 'cloudinary'])
  preferredStorage?: 'local' | 'cloudinary';

  @IsOptional()
  @IsBoolean()
  localDownloadsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  keepLocalMirror?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3650)
  retentionDays?: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  cloudFolder?: string;
}

