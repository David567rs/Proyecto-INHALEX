import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class ImportBackupDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(140)
  backupId!: string;

  @IsOptional()
  @IsString()
  @IsIn(['replace', 'append'])
  mode?: 'replace' | 'append';
}

