type UserEntity = {
  id: string;
  email: string;
  name: string;
  avatar: string;
}

interface UserService {
  getOne(id: string): Promise<UserEntity>;
}

export {
  UserEntity,
  UserService,
};
