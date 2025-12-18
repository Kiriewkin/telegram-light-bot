import { isAdmin } from '../utils/isAdmin.js';
import { User } from '../models/User.js';

export async function sendMessage(bot, msg, match) {
    // 🔐 Проверка админа
    if (!(await isAdmin(msg.from.id))) {
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

    const adminName = msg.from.first_name || msg.from.username || 'Адмін';

    const users = await User.find({});
    let success = 0;

    for (const user of users) {
        try {
            await bot.sendMessage(
                user.chatId,
                `${text}\n\n👤 Повідомлення від: ${adminName}`
            );
            success++;
        } catch (e) {
            // користувач міг заблокувати бота — ігноруємо
        }
    }

    await bot.sendMessage(
        msg.chat.id,
        `✅ Повідомлення надіслано\n👥 Отримали: ${success}/${users.length}`
    );
}