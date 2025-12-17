import { isAdmin } from '../utils/isAdmin.js';
import { Status } from '../models/Status.js';
import { User } from '../models/User.js';
import { formatKiev } from '../utils/formatKiev.js';

export async function setlight(bot, msg, match) {
    if (!isAdmin(msg)) {
        await bot.sendMessage(msg.chat.id, '⛔ У вас нет доступа.');
        return;
    }

    const args = match[1]?.split(' ') || [];
    const mode = args[0];

    let status = await Status.findOne();

    if (!status) {
        status = new Status({ name: 'ЖК' });
    }

    const now = formatKiev();

    if (mode === 'on') {
        status.light = true;
        status.last_change = now;
        status.restore_time = '—';
    }

    if (mode === 'off') {
        status.light = false;
        status.last_change = now;
        status.restore_time = args[1] || 'невідомо';
    }

    status.updated = now;
    await status.save();

    const text = status.light
        ? `✅ Світло зʼявилось\n\n🕒 ${status.last_change}`
        : `❌ Світла нема з ${status.last_change}\n\n⚡️ Орієнтовне відновлення: ${status.restore_time}`;

    const users = await User.find({});

    for (const user of users) {
        try {
            await bot.sendMessage(user.chatId, text);
        } catch (e) {
            // пользователь мог заблокировать бота — игнорируем
        }
    }

    await bot.sendMessage(msg.chat.id, '✅ Статус оновлено та розіслано.');
}
