import express from 'express';
import isAuthenticated from '../../middlewares/auth.ts';

import {
  suggestMore,
  suggestTopics,
  suggestTopPosts,
} from './service.ts';


const setupSuggestionRoute = () => {
  const router = express.Router();
  router.route('/topics').get(suggestTopics);
  router.route('/posts').get(isAuthenticated, suggestTopPosts);
  router.route('/posts/:postID').get(isAuthenticated, suggestMore)

  return router;
};

export default setupSuggestionRoute;
