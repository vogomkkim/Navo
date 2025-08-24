import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { handleLogin, handleRegister } from '../auth/auth.js';

const router = Router();

router.post('/register', asyncHandler(handleRegister));
router.post('/login', asyncHandler(handleLogin));

export default router;
