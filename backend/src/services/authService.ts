import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { createUser, getUserByEmail, getUserById } from '../database/models/User';
import { AppError } from '../middleware/errorHandler';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret';
const SALT_ROUNDS = 12;

export const authService = {
  async register(name: string, email: string, password: string) {
    const existing = await getUserByEmail(email);
    if (existing) {
      throw new AppError(409, 'Email already registered');
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await createUser({
      id: uuidv4(),
      name,
      email,
      password: hashedPassword,
      role: 'customer',
    });

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return { user: { id: user.id, name: user.name, email: user.email, role: user.role }, token };
  },

  async login(email: string, password: string) {
    const user = await getUserByEmail(email);
    if (!user) {
      throw new AppError(401, 'Invalid email or password');
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw new AppError(401, 'Invalid email or password');
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return { user: { id: user.id, name: user.name, email: user.email, role: user.role }, token };
  },

  async getProfile(userId: string) {
    const user = await getUserById(userId);
    if (!user) {
      throw new AppError(404, 'User not found');
    }
    return user;
  },
};
