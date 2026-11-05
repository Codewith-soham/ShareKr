import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { validateBody } from '../../middleware/validate.js';
import { completeProfileSchema } from '../auth/auth.schemas.js';
import { getMe, updateMe } from './users.controller.js';

const router = Router();

router.use(authenticate);
router.get('/me', getMe);
router.patch('/me', validateBody(completeProfileSchema), updateMe);

export { router as usersRoutes };
