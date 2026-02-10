import { User } from '../models/User.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function broadcast(bot, adminChatId, text) {
    // 🧪 DEV — отправляем ТОЛЬКО админу
    if (process.env.APP_MODE === 'dev') {
        await bot.sendMessage(
            adminChatId,
            `🧪 DEV MODE\n\n${text}`
        );
        return { sent: 1, total: 1 };
    }

    // 🚀 PROD — всем пользователям
    const users = await User.find({});
    let success = 0;

    for (const user of users) {
        try {
            await bot.sendMessage(user.chatId, text);
            success++;
        } catch {
            // користувач міг заблокувати бота — ігноруємо
        }

        // невелика затримка, щоб не вдаритися в ліміти Telegram
        await sleep(30);
    }

    return { sent: success, total: users.length };
}
