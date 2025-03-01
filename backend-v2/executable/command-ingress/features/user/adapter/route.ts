import express from 'express';
import { UserController } from './controller';

const setupUserRoute = (controller: UserController) => {
    const router = express.Router();

    router.get('/:id', controller.getOne.bind(controller));

    return router;
}

export default setupUserRoute;
