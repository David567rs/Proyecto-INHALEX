import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class ExchangeAlexaLinkCodeDto {
  @IsString()
  @MinLength(5)
  @MaxLength(20)
  @Matches(/^[a-zA-Z0-9\-\s]+$/)
  code: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Matches(/^[a-zA-Z0-9\-\s]+$/)
  token?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Matches(/^[a-zA-Z0-9\-\s]+$/)
  alexaCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  alexaUserId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  source?: string;
}
