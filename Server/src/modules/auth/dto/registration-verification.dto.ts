import { Transform } from 'class-transformer';
import { IsEmail, IsString, IsUUID, Matches, MaxLength } from 'class-validator';
import { RegisterDto } from './register.dto';

export class SendRegistrationCodeDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email: string;
}

export class VerifiedRegisterDto extends RegisterDto {
  @IsUUID('4')
  challengeId: string;

  @IsString()
  @Matches(/^\d{6}$/)
  code: string;
}
