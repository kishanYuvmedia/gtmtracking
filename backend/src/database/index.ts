import './loadenv';
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gtmtracking';

export async function testConnection(retries = 5, delay = 2000): Promise<boolean> {
  for (let i = 0; i < retries; i++) {
    try {
      await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
      console.log('Database connection successful');
      return true;
    } catch (err) {
      console.error(`DB connection attempt ${i + 1}/${retries} failed:`, (err as Error).message);
      if (i < retries - 1) {
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  return false;
}
