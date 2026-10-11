import { Router } from 'express';
import { register, login, googleLogin, linkGoogle, getMe, updateProfile, refresh, logout } from '../controllers/auth.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { authLimiter } from '../middlewares/rateLimit.middleware';

const router = Router();

// Rate limit dipasang hanya di endpoint yang menerima kredensial
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/refresh', refresh);
router.post('/logout', authMiddleware, logout);
router.post('/google', authLimiter, googleLogin);
router.post('/google/link', authMiddleware, authLimiter, linkGoogle);
router.get('/me', authMiddleware, getMe);
router.put('/me', authMiddleware, updateProfile);

export default router;
