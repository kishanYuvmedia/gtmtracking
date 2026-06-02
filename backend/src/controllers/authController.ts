import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService';
import { AppError } from '../middleware/errorHandler';

export const authController = {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, email, password } = req.body;
      if (!name || !email || !password) {
        throw new AppError(400, 'Missing required fields: name, email, password');
      }
      if (password.length < 8) {
        throw new AppError(400, 'Password must be at least 8 characters');
      }
      const result = await authService.register(name, email, password);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        throw new AppError(400, 'Missing required fields: email, password');
      }
      const result = await authService.login(email, password);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async profile(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await authService.getProfile(req.user!.userId);
      res.json({ user });
    } catch (err) {
      next(err);
    }
  },
};
