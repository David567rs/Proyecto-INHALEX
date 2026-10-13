import { Model, Types } from 'mongoose';
import { UserStatus } from './enums/user-status.enum';
import type { UserDocument } from './schemas/user.schema';
import { UsersService } from './users.service';

describe('UsersService self profile persistence', () => {
  const userId = '000000000000000000000001';
  let users: UsersService;
  const execute = jest.fn<Promise<UserDocument | null>, []>();
  const findOneAndUpdate = jest.fn(() => ({ exec: execute }));

  beforeEach(() => {
    jest.clearAllMocks();
    execute.mockResolvedValue(null);
    users = new UsersService({
      findOneAndUpdate,
    } as unknown as Model<UserDocument>);
  });

  it('only records activity for an existing active account', async () => {
    await expect(users.markActiveUserActivity(userId)).resolves.toBeNull();
    expect(findOneAndUpdate).toHaveBeenCalledWith(
      { _id: new Types.ObjectId(userId), status: UserStatus.ACTIVE },
      { $set: { lastSeenAt: expect.any(Date) as Date } },
      { returnDocument: 'after' },
    );
  });

  it('atomically matches the active signed account and derives its full name', async () => {
    const profile = {
      firstName: 'María',
      lastName: 'López',
      phone: '7712345678',
    };
    await expect(users.updateOwnProfile(userId, profile)).resolves.toBeNull();
    expect(findOneAndUpdate).toHaveBeenCalledWith(
      { _id: new Types.ObjectId(userId), status: UserStatus.ACTIVE },
      { $set: { ...profile, name: 'María López' } },
      { returnDocument: 'after', runValidators: true },
    );
  });

  it('does not spread extra properties even if called outside the DTO path', async () => {
    await users.updateOwnProfile(userId, {
      firstName: 'María',
      lastName: 'López',
      phone: '7712345678',
      _id: '000000000000000000000002',
      name: 'Fake name',
      role: 'admin',
      status: 'active',
      email: 'another@example.test',
      passwordHash: 'injected',
    } as unknown as Parameters<UsersService['updateOwnProfile']>[1]);
    expect(findOneAndUpdate).toHaveBeenCalledWith(
      { _id: new Types.ObjectId(userId), status: UserStatus.ACTIVE },
      {
        $set: {
          firstName: 'María',
          lastName: 'López',
          name: 'María López',
          phone: '7712345678',
        },
      },
      { returnDocument: 'after', runValidators: true },
    );
  });

  it('returns the persisted document for the response', async () => {
    const saved = { name: 'María López' } as UserDocument;
    execute.mockResolvedValue(saved);
    await expect(
      users.updateOwnProfile(userId, {
        firstName: 'María',
        lastName: 'López',
        phone: '7712345678',
      }),
    ).resolves.toBe(saved);
  });
});
