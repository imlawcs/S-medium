/* eslint-disable @typescript-eslint/no-explicit-any */
import express from 'express';
import env from './utils/env';
import logger from './middlewares/logger';
import morgan from 'morgan';
import { Server as socketIo } from 'socket.io';

import cors from 'cors';
import { recoverMiddleware } from './middlewares/recover';
import { createServer } from 'http';

import { AuthController } from './features/auth/adapter/controller';
import { AuthServiceImpl } from './features/auth/domain/service';
import { GoogleIdentityBroker } from './features/auth/identity-broker/google-idp.broker';
import { PostServiceImpl } from './features/post/domain/service';
import { PostController } from './features/post/adapter/controller';

import initAuthRoute from './features/auth/adapter/route';
import initPostRoute from './features/post/adapter/route';
import initUserRoute from './features/user/adapter/route';
import { UserController } from './features/user/adapter/controller';
import { UserServiceImpl } from './features/user/domain/service';

import setupSuggestionRoute from './features/suggestion/route';

const app = express();

const createHttpServer = (redisClient: any, db: any) => {
  const server = createServer(app);

  const io = new socketIo(server); 
  
  io.on('connection', (socket) => {
    console.log('A user connected');
    
    socket.on('disconnect', () => {
      console.log('User disconnected');
    });

    socket.emit('message', { text: 'Hello from server!' });
  });

  const isProd = !env.DEV;
  if (isProd) {
    app.use(logger);
  }
  app.use(cors());
  app.use(morgan('combined'));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  const googleIdentityBroker = new GoogleIdentityBroker({
    clientID: env.GOOGLE_OAUTH_CLIENT_ID,
    clientSecret: env.GOOGLE_OAUTH_CLIENT_SECRET,
    redirectURL: env.GOOGLE_OAUTH_REDIRECT_URL,
  });

  const authService = new AuthServiceImpl(
    googleIdentityBroker,
    env.JWT_SECRET,
    env.JWT_REFRESH_SECRET
  );
  
  const postService = new PostServiceImpl();
  const userService = new UserServiceImpl();

  app.use('/auth', initAuthRoute(new AuthController(authService)));
  app.use('/post', initPostRoute(new PostController(postService, redisClient)));
  app.use('/users', initUserRoute(new UserController(userService)));
  
  app.use('/suggestions', setupSuggestionRoute());

  app.use(recoverMiddleware);

  return server;
};

export {
  createHttpServer,
};