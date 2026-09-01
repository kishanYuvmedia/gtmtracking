import dotenv from 'dotenv';
import path from 'path';

const envFile = process.env.NODE_ENV === 'production' ? '../../.env.production' : '../../.env';
dotenv.config({ path: path.resolve(__dirname, envFile) });
