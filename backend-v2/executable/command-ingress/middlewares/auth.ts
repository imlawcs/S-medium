import { NextFunction, Response } from 'express';
import env from '../utils/env';
import jwt from 'jsonwebtoken';
import { HttpRequest } from '../types';

const requireAuthorizedUser = (req: HttpRequest, res: Response, next: NextFunction) => {
  try {
    const bearerToken = req.headers['authorization'];
    const jwtToken = bearerToken?.split(' ')[1];

    if (!jwtToken) {
      res.sendStatus(401);
      return;
    }

    const payload = jwt.verify(jwtToken, env.JWT_SECRET);

    if (!payload.sub) {
      res.sendStatus(401);
      return;
    }

    req.getSubject = () => String(payload.sub);
    next();
  } catch (error) {
    next(error);
  }
};

export default requireAuthorizedUser;
