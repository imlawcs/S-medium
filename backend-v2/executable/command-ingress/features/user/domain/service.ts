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

}