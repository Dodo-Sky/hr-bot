import { type Context } from 'grammy';
import { type Conversation } from '@grammyjs/conversations';
import { getDataFromServer, getStaffFioAndUnit, postDataServer } from '../../services/api';
import { sheetsApi } from '../../services/google';
import { Members, TelegramID } from '../../type/type';
import { addWeeks, setDay, format, addMonths, setDate, addDays, getDay } from 'date-fns';

const SPREADSHEET_ID = '1AF1mudfqU8540NiStIXMpR6y60xxwF_0ZsiZcNyKUM8';

function getDateControl(staffTypeAgent: string) {
  // ближайший вторник (по курьерам)
  if (staffTypeAgent == 'Courier') {
    return format(setDay(addWeeks(new Date(), 1), 2, { weekStartsOn: 1 }), 'dd.MM.yyyy');

    // 07 число месяца (ближаший рабочий день)
  } else {
    let dataControl = setDate(addMonths(new Date(), 1), 7);
    let day = getDay(dataControl); // 0 - воскресенье, 6 - суббота

    if (day >= 1 && day <= 5) {
      return format(dataControl, 'dd.MM.yyyy'); // Пн–Пт
    }
    if (day === 6) {
      return format(addDays(dataControl, 2), 'dd.MM.yyyy'); // Сб → Пн
    }
    if (day === 0) {
      return format(addDays(dataControl, 1), 'dd.MM.yyyy'); // Вс → Пн
    }
  }
}

export async function friendPayAccepted(conversation: Conversation, ctx: Context) {
  let [, innFriend, payCount, innAgent] = ctx.callbackQuery!.data!.split('+');
  await ctx.reply('Ожидайте отчета о загрузке. Если отчета не будет попробуйте позднее');

  const googleSheetsResponse = await sheetsApi.spreadsheets.values.get({
    range: 'Отчет!A2:L',
    spreadsheetId: SPREADSHEET_ID,
  });
  const sheetData = googleSheetsResponse.data.values!;

  const members: Members[] = await getDataFromServer('members');

  const member: Members | undefined = members.find(
    (member: Members) => innAgent === member.taxpayerIdentificationNumber,
  );
  if (!member) {
    await ctx.reply('Сотрудник не найден');
    return;
  }

  const staffType = member.staffType;
  const arrInnPay = sheetData.map((row) => String(row[1]) + row[5] + row[8]);

  let rangeNum;
  let fioAgent;
  let fioFriend;
  sheetData.forEach((el, i) => {
    if (arrInnPay.includes(innAgent + innFriend + payCount)) {
      if (String(el[1]) + el[5] + el[8] === innAgent + innFriend + payCount) {
        rangeNum = i + 2;
        fioAgent = el[3];
        fioFriend = el[6];
      }
    }
  });

  await sheetsApi.spreadsheets.values.update({
    range: `Отчет!H${rangeNum}:L`,
    spreadsheetId: SPREADSHEET_ID,
    valueInputOption: 'RAW',
    requestBody: {
      values: [['Согласовано', payCount, '', 'Нет', getDateControl(staffType)]],
    },
  });

  await ctx.reply(
    `Отчет
Вы приняли решение *Согласовать* выплату премии по программе "Приведи друга".
Агент - ${fioAgent}
Друг - ${fioFriend}
Номер выплаты - ${payCount}
Сделана запись в базе даннных. Спасибо за работу`,
    {
      parse_mode: 'Markdown',
    },
  );

  // Сообщение в бухгалтерию
  let unitFriend;
  let staffTypeFriend;
  let unitAgent;
  let staffTypeAgent;
  members.forEach((member: Members) => {
    if (member.taxpayerIdentificationNumber === innFriend) {
      unitFriend = member.unitName;
      staffTypeFriend = member.staffType;
    }
    if (member.taxpayerIdentificationNumber === innAgent) {
      unitAgent = member.unitName;
      staffTypeAgent = member.staffType;
    }
  });
  const telegramID: TelegramID[] = await getDataFromServer('tekegramID');
  let chatId: number;
  members.forEach((member: Members) => {
    if (member.taxpayerIdentificationNumber === innAgent) {
      telegramID.forEach(({ id, unitName }) => {
        if (member.staffType === 'Courier') {
          if (unitName == 'Заместитель главного бухгалтера') {
            chatId = id;
          }
        } else {
          if (unitName == 'Бухгалтер по зарплате') {
            chatId = id;
          }
        }
      });
    }
  });

  await ctx.api.sendMessage(
    chatId!,
    `Необходимо вылатить 10 000 рублей (проконтролировать начисление и выплату) денежных средств  в пользу  *${fioAgent}* из ${unitAgent}
Основание - приглашенный им/ей друг ${fioFriend} сдал аттестацию (если сотрудник кухни) или развез требуемое количество заказов (курьер)`,
    {
      parse_mode: 'Markdown',
    },
  );

  let message;
  if (staffTypeFriend === 'Courier') {
    message = `
  Разместите в группе с сотрудниками объяление. Вот примерный текст
  
  Благодарим ${fioAgent} за участие в реферальной программе "Приведи друга". 
  Курьер *${fioFriend}* с ${unitFriend} развез количество заказов, необходимое для получения выплаты. 
  Управляющий расскажет как полуить премию в размере 10000 рублей рублей🤗🎊`;
  }

  if (staffTypeFriend === 'KitchenMember') {
    message = `
  Разместите в группе с сотрудниками объяление. Вот примерный текст
    
  Благодарим *${fioAgent}* за участие в реферальной программе "Приведи друга".
   ${fioFriend} с ${unitFriend} прошел аттестацию и стал специалистом. Управлящий расскажет как получить премию в 10 000 рублей🤗🎊`;
  }

  await ctx.reply(message!, {
    parse_mode: 'Markdown',
  });
}
