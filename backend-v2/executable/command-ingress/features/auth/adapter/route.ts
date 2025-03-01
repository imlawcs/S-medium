import express from 'express';
import { AuthController } from './controller';

const initAuthRoute: (controller: AuthController) => express.Router  = (controller) => {
  const router = express.Router();

  router.route('/google/oauth').get(controller.exchangeGoogleToken.bind(controller));
  router.route('/logout').post(controller.logout.bind(controller));
  router.route('/token').post(controller.refreshToken.bind(controller));

  return router;
};

export default initAuthRoute;