import { UserEntity, UserService } from '../types';
import UserModel from '../../../../../internal/model/user';

export class UserServiceImpl implements UserService {
  async getOne(id: string): Promise<UserEntity> {
    const user = await UserModel.findById(id);

    return {
      id: String(user._id),
      name: String(user.name),
      avatar: String(user.avatar),
      email: String(user.email),
    };
  }

  async followUser(followerId: string, followeeId: string): Promise<boolean> {
    const follower = await UserModel.findById(followerId);
    const followee = await UserModel.findById(followeeId);

    if (!follower || !followee) {
      throw new Error('User not found');
    }

    const isFollowing = follower.followings.includes(followee._id);
    if (isFollowing) {
      throw new Error('Already following');
    }

    follower.followings.push(followee._id);
    followee.followers.push(follower._id);

    const followerResult = await follower.save();
    const followeeResult = await followee.save();
    if(!followerResult || !followeeResult) {
      return false;
    }
    else {
      return true;
    }
  }

  async unfollowUser(followerId: string, followeeId: string): Promise<boolean> {
    const follower = await UserModel.findById(followerId);
    const followee = await UserModel.findById(followeeId);

    if (!follower || !followee) {
      throw new Error('User not found');
    }

    const isFollowing = follower.followings.includes(followee._id);
    if (!isFollowing) {
      throw new Error('Not following');
    }

    follower.followings = follower.followings.filter((id) => id !== followee._id);
    followee.followers = followee.followers.filter((id) => id !== follower._id);

    const followerResult = await follower.save();
    const followeeResult = await followee.save();
    if(!followerResult || !followeeResult) {
      return false;
    }
    else {
      return true;
    }
  }

  async fetchFollower(userId: string): Promise<UserEntity[]> {
    const user = await UserModel.findById(userId).populate<{ followers: UserEntity[] }>('followers');

    if (!user) {
      throw new Error('User not found');
    }

    return user.followers.map((follower) => ({
      id: String(follower.id),
      name: String(follower.name),
      avatar: String(follower.avatar),
      email: String(follower.email),
    }));
  }

  async fetchFollowing(userId: string): Promise<UserEntity[]> {
    const user = await UserModel.findById(userId).populate<{ followings: UserEntity[] }>('followings');

    if (!user) {
      throw new Error('User not found');
    }

    return user.followings.map((followee) => ({
      id: String(followee.id),
      name: String(followee.name),
      avatar: String(followee.avatar),
      email: String(followee.email),
    }));
  }
}