import {
  IsEmail,
  IsString,
  IsStrongPassword,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const NAME_REGEX = /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü' -]+$/;
const PHONE_REGEX = /^\d{10,15}$/;

export class RegisterDto {
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(NAME_REGEX)
  firstName: string;

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(NAME_REGEX)
  lastName: string;

  @IsEmail()
  email: string;

  @IsString()
  @Matches(PHONE_REGEX)
  phone: string;

  @IsString()
  @IsStrongPassword({
    minLength: 8,
    minLowercase: 0,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 1,
  })
  password: string;
}
