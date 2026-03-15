import { IsEnum, IsOptional } from 'class-validator';
import { UserRole } from '../../users/enums/user-role.enum';
import { UserStatus } from '../../users/enums/user-status.enum';

export class UpdateUserByAdminDto {
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}

