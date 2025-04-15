import { type Context } from 'grammy';
import { type Conversation } from '@grammyjs/conversations';
import { sheetsApi } from '../../services/google';

const SPREADSHEET_ID = '1AF1mudfqU8540NiStIXMpR6y60xxwF_0ZsiZcNyKUM8';

export async function friendPayConfirmed(conversation: Conversation, ctx: Context) {
  const [, staffId] = ctx.callbackQuery!.data!.split('+');
  await ctx.reply('Ожидайте отчета о загрузке. Если отчета не будет попробуйте позднее');

  let googleSheetsResponse = await sheetsApi.spreadsheets.values.get({
    range: 'Отчет!A2:I',
    spreadsheetId: SPREADSHEET_ID,
  });
  const sheetData = googleSheetsResponse.data.values!;

  let range;
  let fio;
  sheetData.forEach((el, i) => {
    if (staffId === el[2]) {
      range = i + 2;
      fio = el[3];
    }
  });

  if (!range || !fio) {
    await ctx.reply('Данные не найдены');
    return;
  }

  await sheetsApi.spreadsheets.values.update({
    range: `Отчет!K${range}`,
    spreadsheetId: SPREADSHEET_ID,
    valueInputOption: 'RAW',
    requestBody: {
      values: [['Выплачено']],
    },
  });
  await ctx.reply(`Отлично информация о выплате  в пользу ${fio} внесена в базу данных. Спасибо за работу`);
}