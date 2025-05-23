import * as dotenv from 'dotenv';
dotenv.config();

const getEnv = (name: string): string => {
  if (!process.env[name]) {
    throw new Error('Не найдена переменная окружения ' + name);
  }
  return process.env[name];
};


export const API_BASE_URL = getEnv('API_BASE_URL');
export const BOT_TOKEN  = getEnv('BOT_TOKEN');