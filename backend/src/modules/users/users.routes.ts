import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { requireCsrfHeader } from '../../middleware/requireCsrfHeader.js';
import { validateBody } from '../../middleware/validate.js';
import { deleteMe, getMe, getUploadSignature, updateMe } from './users.controller.js';
import { deleteAccountSchema, updateProfileSchema } from './users.schemas.js';

const router = Router();

router.use(authenticate);
router.get('/me', getMe);
router.patch('/me', validateBody(updateProfileSchema), updateMe);
router.post('/me/profile-image/upload-signature', getUploadSignature);
router.delete('/me', requireCsrfHeader, validateBody(deleteAccountSchema), deleteMe);

export { router as usersRoutes };
