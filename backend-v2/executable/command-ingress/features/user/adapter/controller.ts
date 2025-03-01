import { BaseController } from '../../../shared/base-controller';
import { HttpRequest } from '../../../types';
import { UserService } from '../types';
import { Response, NextFunction } from 'express';
import responseValidationError from '../../../shared/response';
import { FollowUserDto, UnfollowUserDto, FetchFollowersDto, FetchFollowingDto } from './dto';

export class UserController extends BaseController {
  service: UserService;

  constructor(service: UserService) {
    super();
    this.service = service;
  }

  async getOne(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res, _next) => {
      const { id } = req.params;
      const user = await this.service.getOne(id);
      res.status(200).json(user);
      return;
    });
  }

  async followUser(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res, _next) => {
      const followeeDto = new FollowUserDto(req.body);

      const validateResult = await followeeDto.validate();
      if (!validateResult.ok) {
        responseValidationError(res, validateResult.errors[0]);
        return;
      }

      const followerId = req.getSubject();
      const result = await this.service.followUser(followerId, followeeDto.id);
      res.status(200).json(result);
      return;
    });
  }

  async unfollowUser(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res, _next) => {
      const followeeDto = new UnfollowUserDto(req.body);

      const validateResult = await followeeDto.validate();
      if (!validateResult.ok) {
        responseValidationError(res, validateResult.errors[0]);
        return;
      }

      const followerId = req.getSubject();
      const result = await this.service.unfollowUser(followerId, followeeDto.id);
      res.status(200).json(result);
      return;
    });
  }

  async fetchFollower(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res, _next) => {
      const fetchFollowersDto = new FetchFollowersDto(req.params);
      const users = await this.service.fetchFollower(fetchFollowersDto.id);
      res.status(200).json(users);
      return;
    });
  }

  async fetchFollowing(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res, _next) => {
      const fetchFollowingDto = new FetchFollowingDto(req.params);
      const users = await this.service.fetchFollowing(fetchFollowingDto.id);
      res.status(200).json(users);
      return;
    });
  }
}