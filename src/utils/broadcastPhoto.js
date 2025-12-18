import { User } from '../models/User.js';

export async function broadcastPhoto(bot, adminChatId, photo, caption) {
    if (process.env.APP_MODE === 'dev') {
        await bot.sendPhoto(adminChatId, photo, {
            caption: `🧪 DEV MODE\n\n${caption}`
        });
        return { sent: 1, total: 1 };
    }

    const users = await User.find({});
    let success = 0;

    for (const user of users) {
        try {
            await bot.sendPhoto(user.chatId, photo, { caption });
            success++;
        } catch {}
    }

    return { sent: success, total: users.length };
}

