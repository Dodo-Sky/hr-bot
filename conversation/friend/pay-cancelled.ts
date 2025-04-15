import { type Context } from 'grammy';
import { type Conversation } from '@grammyjs/conversations';
import { getDataFromServer, getStaffFioAndUnit, postDataServer } from '../../services/api';
import { sheetsApi } from '../../services/google';
import { Members, TelegramID } from '../../type/type';

//const SPREADSHEET_ID = '1p_mF2iv0IQTRw1v2bpH33Q66rE8GVUqS8rln3luMuV8';
const SPREADSHEET_ID = '1AF1mudfqU8540NiStIXMpR6y60xxwF_0ZsiZcNyKUM8';

export async function friendPayCancelled(conversation: Conversation, ctx: Context) {
  let [, innFriend, payCount, innAgent] = ctx.callbackQuery!.data!.split('+');
  await ctx.reply('Ожидайте отчета о загрузке. Если отчета не будет попробуйте позднее');

  let fioAgent;
  let fioFriend;
  let staffTypeAgent;

  const members: Members[] = await getDataFromServer('members');

  members.forEach(({ fio, taxpayerIdentificationNumber, staffType }) => {
    if (taxpayerIdentificationNumber === innFriend) {
      fioFriend = fio;
    }
    if (taxpayerIdentificationNumber === innAgent) {
      fioAgent = fio;
      staffTypeAgent = staffType;
    }
  });

  let question = await ctx.reply(
    `В ответном сообщении напишите причину отказа в выплате премии в пользу *${fioAgent}*`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        force_reply: true,
        input_field_placeholder: 'Причина отказа',
      },
    },
  );

  const ctx1 = await conversation
    .waitForReplyTo(question.message_id, {
      otherwise: (ctx) =>
        ctx.reply('ОШИБКА! Ответьте на этот вопрос для продолжения работы', {
          reply_parameters: { message_id: question.message_id },
        }),
    })
    .andFor(':text', { otherwise: (ctx) => ctx.reply('Ответ принимается только текстом') });

  const comment = ctx1.message!.text;
  console.log(comment);
  const googleSheetsResponse = await sheetsApi.spreadsheets.values.get({
    range: 'Отчет!A2:K',
    spreadsheetId: SPREADSHEET_ID,
  });

  let dataSheet = googleSheetsResponse.data.values!;

  let arrInnPay = dataSheet.map((el) => String(el[1]) + el[5] + el[8]);

  let rangeNum;
  dataSheet.forEach((el, i) => {
    if (arrInnPay.includes(innAgent + innFriend + payCount)) {
      if (String(el[1]) + el[5] + el[8] === innAgent + innFriend + payCount) {
        rangeNum = i + 2;
        fioAgent = el[3];
        fioFriend = el[6];
      }
    }
  });

  await sheetsApi.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `Отчет!H${rangeNum}:L`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [['Отказ', payCount, comment, '', '']],
    },
  });

  await ctx.reply(
    `Отчет
Вы приняли решение *отказать* в выплате премии по программе "Приведи друга".
Агент - ${fioAgent}
Друг - ${fioFriend}
Номер выплаты - ${payCount}
Обоснование  отказа - ${comment}
Сделана запись в базе даннных.`,
    {
      parse_mode: 'Markdown',
    },
  );
}