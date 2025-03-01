import { Request, Response, NextFunction } from 'express';

interface HttpRequest extends Request {
  getSubject(): string;
}

type AsyncHandler = (req: HttpRequest, res: Response, next: NextFunction) => Promise<void>;

export {
  HttpRequest,
  AsyncHandler,
};