export const mainKeyboard = {
    reply_markup: {
        keyboard: [
            [{ text: '💡 Світло' }, { text: '📅 Графік' }],
        ],
        resize_keyboard: true
    }
};

export const adminKeyboard = {
  reply_markup: {
    inline_keyboard: [
      [{ text: '💡 Світло: увімкнено', callback_data: 'light_on' }],
      [{ text: '❌ Світло: вимкнено', callback_data: 'light_off' }],
      [{ text: '⚡️ Змінити час відновлення', callback_data: 'restore_time' }],
      [{ text: '📅 Оновити графік', callback_data: 'update_schedule' }],
      [{ text: '📣 Надіслати повідомлення', callback_data: 'broadcast' }],
      [{ text: 'ℹ️ Допомога', callback_data: 'help' }]
    ]
  }
};
