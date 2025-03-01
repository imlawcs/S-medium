type UserEntity = {
  id: string;
  email: string;
  name: string;
  avatar: string;
}

interface UserService {
  getOne(id: string): Promise<UserEntity>;
  followUser(followerId: string, followeeId: string): Promise<boolean>;
  unfollowUser(followerId: string, followeeId: string): Promise<boolean>;
  fetchFollower(userId: string): Promise<UserEntity[]>;
  fetchFollowing(userId: string): Promise<UserEntity[]>;
}

export {
  UserEntity,
  UserService,
};
