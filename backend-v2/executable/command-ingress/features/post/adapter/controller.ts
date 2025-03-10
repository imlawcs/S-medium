import { NextFunction, Response } from 'express';
import { BaseController } from '../../../shared/base-controller';
import { PostService } from '../types';
import { CreatePostBody, GetPostDto, UpdatePostBody } from './dto';
import responseValidationError from '../../../shared/response';
import { HttpRequest } from '../../../types';
import redisSink from '../../../feed/sink/redis_sink';
import { createClient } from 'redis';

export class PostController extends BaseController {
  service: PostService;
  redisSink: redisSink;

  constructor(service: PostService, redisClient: ReturnType<typeof createClient>) {
    super();
    this.service = service;
    this.redisSink = new redisSink(redisClient);
  }

  async getPost(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res, _next) => {
      const getPostDto = new GetPostDto(req.params);
      const validateResult = await getPostDto.validate();
      if (!validateResult.ok) {
        responseValidationError(res, validateResult.errors[0]);
        return;
      }

      const post = await this.service.getPost(getPostDto.id);
      res.status(200).json({ post });
    });
  }

  async createPost(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = new CreatePostBody(req.body);
      const sub = req.getSubject();

      console.log("[CreatePost] Request body:", body);

      const validateResult = await body.validate();
      if (!validateResult.ok) {
        console.error("[CreatePost] Validation errors:", validateResult.errors);
        return responseValidationError(res, validateResult.errors[0]);
      }

      const post = await this.service.createPost({
        authorID: sub,
        title: body.title,
        markdown: body.markdown,
        image: body.image,
        tags: body.tags,
      });

      res.status(201).json(post);
    } catch (error) {
      console.error("[CreatePost] Internal server error:", error);
      res.status(500).json({ message: "Internal server error", error });
    }
  }

  async fetchPostByUser(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res, _next) => {
      const id = req.params.id;
      if (!id) {
        res.status(400).json({ message: "User ID is required" });
        return;
      }

      const posts = await this.service.fetchPostsByUser(id);
      res.status(200).json(posts);
    });
  }

  async updatePost(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res, _next) => {
      const id = req.params.id;
      if (!id) {
        res.status(400).json({ message: "Post ID is required" });
        return;
      }

      const body = new UpdatePostBody(req.body);
      const validateResult = await body.validate();
      if (!validateResult.ok) {
        return responseValidationError(res, validateResult.errors[0]);
      }

      const post = await this.service.updatePost(id, body);
      res.status(200).json(post);
    });
  }

  async deletePost(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res, _next) => {
      const id = req.params.id;
      if (!id) {
        res.status(400).json({ message: "Post ID is required" });
        return;
      }

      const result = await this.service.deletePost(id);
      res.status(200).json(result);
    });
  }

  async fetchFollowingPosts(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res, _next) => {
      const sub = req.getSubject();
      if (!sub) {
        res.status(400).json({ message: "User ID is required" });
        return;
      }

      try {
        const feeds = await this.redisSink.getUserFeed(sub);
        res.status(200).json(feeds);
      } catch (error) {
        console.error("[fetchFollowingPosts] Error fetching feed:", error);
        res.status(500).json({ message: "Internal server error", error });
      }
    });
  }
}
