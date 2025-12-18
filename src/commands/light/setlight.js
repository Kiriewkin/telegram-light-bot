import { isAdmin } from '../../utils/isAdmin.js';
import { Status } from '../../models/Status.js';
import { formatKiev } from '../../utils/formatKiev.js';
import { broadcast } from '../../utils/broadcast.js';
import { formatBroadcastResult } from '../../helpers/formatBroadcastResult.js';

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

    const result = await broadcast(bot, msg.chat.id, text);

    await bot.sendMessage(msg.chat.id,`✅ Повідомлення надіслано\n ${formatBroadcastResult(result)}`);
}
