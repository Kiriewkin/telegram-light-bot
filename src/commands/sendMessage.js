import { isAdmin } from '../utils/isAdmin.js';
import { User } from '../models/User.js';

export async function sendMessage(bot, msg, match) {
    // 🔐 Проверка админа
    if (!isAdmin(msg)) {
        await bot.sendMessage(msg.chat.id, '⛔ У вас немає доступу.');
        return;
    }

    const text = match?.[1];

    if (!text) {
        await bot.sendMessage(
            msg.chat.id,
            '❗ Використання:\n/message Текст повідомлення'
        );
        return;
    }

    const users = await User.find({});
    let success = 0;

    for (const user of users) {
        try {
            await bot.sendMessage(user.chatId, text);
            success++;
        } catch (e) {
            // пользователь мог заблокировать бота — игнорируем
        }
    }

    await bot.sendMessage(
        msg.chat.id,
        `✅ Повідомлення надіслано\n👥 Отримали: ${success}/${users.length}`
    );
}
