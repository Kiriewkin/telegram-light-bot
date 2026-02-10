import { isAdmin } from '../../utils/isAdmin.js';
import { Status } from '../../models/Status.js';
import { formatKiev } from '../../utils/formatKiev.js';
import { broadcast } from '../../utils/broadcast.js';
import { formatBroadcastResult } from '../../helpers/formatBroadcastResult.js';

export async function setlight(bot, msg, match) {
    if (!(await isAdmin(msg.from.id))) {
        await bot.sendMessage(msg.chat.id, '⛔ У вас нет доступа.');
        return;
    }

    const args = match[1]?.split(' ') || [];
    const mode = args[0];
    const reason = args.slice(1).join(' ');

    let status = await Status.findOne();
    if (!status) {
        status = new Status({ name: 'ЖК' });
    }

    const now = formatKiev();

    // 🔑 перевірка дублювання
    if (mode === 'on' && status.light === true) {
        await bot.sendMessage(msg.chat.id, '⚠️ Світло вже увімкнено, стан не змінено.');
        return;
    }

    if (mode === 'off' && status.light === false) {
        await bot.sendMessage(msg.chat.id, '⚠️ Світло вже вимкнено, стан не змінено.');
        return;
    }

    // якщо стан змінюється
    if (mode === 'on') {
        status.light = true;
        status.last_change = now;
        status.restore_time = '—';
    }

    if (mode === 'off') {
        status.light = false;
        status.last_change = now;
        status.restore_time = reason || 'невідомо';
    }

    status.updated = now;
    await status.save();

    const adminName = msg.from.first_name || msg.from.username || 'Адмін';

    const text = status.light
        ? `✅ Світло зʼявилось\n\n🕒 ${status.last_change}\n👤 Змінив: ${adminName}`
        : `❌ Світла немає з ${status.last_change}\n\n⚡️ Орієнтовне відновлення: ${status.restore_time}\n👤 Змінив: ${adminName}`;

    const result = await broadcast(bot, msg.chat.id, text);

    await bot.sendMessage(msg.chat.id, `✅ Повідомлення надіслано\n ${formatBroadcastResult(result)}`);
}
