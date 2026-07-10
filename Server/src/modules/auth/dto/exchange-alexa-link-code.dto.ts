import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class ExchangeAlexaLinkCodeDto {
  @IsString()
  @MinLength(5)
  @MaxLength(20)
  @Matches(/^[a-zA-Z0-9\-\s]+$/)
  code: string;
}
