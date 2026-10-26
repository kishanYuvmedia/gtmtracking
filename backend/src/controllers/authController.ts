import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService';
import { AppError } from '../middleware/errorHandler';

export const authController = {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, email, password, business_type, category } = req.body;
      if (!name || !email || !password) {
        throw new AppError(400, 'Missing required fields: name, email, password');
      }
      if (password.length < 8) {
        throw new AppError(400, 'Password must be at least 8 characters');
      }
      const result = await authService.register(name, email, password, business_type, category);
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

  async verifyOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, code } = req.body;
      if (!email || !code) throw new AppError(400, 'Missing email or code');
      const result = await authService.verifyOtp(email, code);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async resendOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;
      if (!email) throw new AppError(400, 'Missing email');
      const result = await authService.resendOtp(email);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;
      if (!email) throw new AppError(400, 'Missing email');
      const result = await authService.forgotPassword(email);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, password } = req.body;
      if (!token || !password) throw new AppError(400, 'Missing token or password');
      const result = await authService.resetPassword(token, password);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, business_type, category } = req.body;
      const user = await authService.updateProfile(req.user!.userId, { name, business_type, category });
      res.json({ user });
    } catch (err) {
      next(err);
    }
  },

  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) throw new AppError(400, 'Missing passwords');
      const result = await authService.changePassword(req.user!.userId, currentPassword, newPassword);
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
