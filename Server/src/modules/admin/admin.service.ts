import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { UsersService } from '../users/users.service';
import { UpdateUserByAdminDto } from './dto/update-user-by-admin.dto';
import { UserRole } from '../users/enums/user-role.enum';
import { UserStatus } from '../users/enums/user-status.enum';

@Injectable()
export class AdminService {
  constructor(private readonly usersService: UsersService) {}

  listUsers() {
    return this.usersService.listAll();
  }

  async updateUser(
    userId: string,
    payload: UpdateUserByAdminDto,
    actorUserId: string,
  ) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user id');
    }

    if (payload.role === undefined && payload.status === undefined) {
      throw new BadRequestException('At least one field must be updated');
    }

    if (
      userId === actorUserId &&
      ((payload.role !== undefined && payload.role === UserRole.USER) ||
        payload.status === UserStatus.INACTIVE)
    ) {
      throw new BadRequestException(
        'You cannot remove your own admin access or deactivate yourself',
      );
    }

    const updatedUser = await this.usersService.updateById(userId, payload);

    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }

    return updatedUser;
  }
}
