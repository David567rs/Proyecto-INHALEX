import { Type } from 'class-transformer';
import {
  Equals,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class PushEndpointDto {
  @IsString()
  @MaxLength(2048)
  @Matches(/^https:\/\//)
  endpoint: string;
}

export class PushKeysDto {
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{87}$/)
  p256dh: string;

  @IsString()
  @Matches(/^[A-Za-z0-9_-]{22}$/)
  auth: string;
}

export class SavePushSubscriptionDto extends PushEndpointDto {
  @IsObject()
  @ValidateNested()
  @Type(() => PushKeysDto)
  keys: PushKeysDto;

  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  expirationTime?: number | null;

  // Account rebinding is a deliberate opt-in, never a side effect of reading status.
  @Equals(true)
  consent: true;
}
