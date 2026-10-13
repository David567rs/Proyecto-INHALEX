import { Transform } from 'class-transformer';
import { IsString, Length, Matches } from 'class-validator';

const NAME_CHARACTERS = /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü' -]+$/;
const HAS_LETTER = /[A-Za-zÁÉÍÓÚáéíóúÑñÜü]/;
const normalizeName = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value;

export class UpdateProfileDto {
  @Transform(normalizeName)
  @IsString()
  @Length(2, 50)
  @Matches(NAME_CHARACTERS)
  @Matches(HAS_LETTER)
  firstName: string;

  @Transform(normalizeName)
  @IsString()
  @Length(2, 50)
  @Matches(NAME_CHARACTERS)
  @Matches(HAS_LETTER)
  lastName: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Matches(/^\d{10,15}$/)
  phone: string;
}
