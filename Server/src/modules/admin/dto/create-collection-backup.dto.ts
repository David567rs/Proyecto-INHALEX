import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export class CreateCollectionBackupDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @Matches(/^[a-zA-Z0-9_.-]+$/)
  collection!: string;
}

