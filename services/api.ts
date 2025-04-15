import * as dotenv from 'dotenv';
import { StaffFioAndUnitAndHiredOn } from '../type/type';
dotenv.config();

const getEnv = (name: string): string => {
  if (!process.env[name]) {
    throw new Error('Не найдена переменная окружения ' + name);
  }
  return process.env[name];
};
const URL = getEnv('API_BASE_URL');

export const getDataFromServer = async (variable: string) => {
  const url = `${URL}globalGetServer?payload=${variable}`;
  const response = await fetch(url);
  try {
    const data = await response.json();
    return data;
  } catch (error) {
    return 'Произошла ошибка при получении данных';
  }
};

export async function postDataServer(variableName: string, payload: any) {
  try {
    const url = `${URL}${variableName}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    let data = await response.json();
    if (response.ok) {
      return data;
    } else {
      const responseData = await response.text();
      alert('Ошибка обратитесь к администратору ' + responseData);
    }
  } catch (error: unknown) {
    return 'Произошла ошибка при передаче данных';
  }
}

export async function getStaffFioAndUnit(staffId: string): Promise<StaffFioAndUnitAndHiredOn | null> {
  const url = `${URL}staff/${staffId}`;
  try {
    const response = await fetch(url);
    return await response.json();
  } catch (error) {
    console.error('Error fetching staff data:', error);
    return null;
  }
}
