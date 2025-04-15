export async function setMyCommands(bot: any) {
  await bot.api.setMyCommands(
    [
      { command: 'message_courier', description: 'Сообщения курьерам' },
      { command: 'message_kitchen', description: 'Сообщения сотрудникам кухни' },
      { command: 'message_help', description: 'Описание программы отправки сообщений курьерам' },
      { command: 'friend', description: 'Программа приведи друга' },
      { command: 'discipline', description: 'Программа соблюдение дисциплины' },
    ],
    {
      scope: {
        type: 'all_private_chats',
      },
    },
  );
}
