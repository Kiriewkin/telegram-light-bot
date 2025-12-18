import { isAdmin } from '../../utils/isAdmin.js';
import { Status } from '../../models/Status.js';
import { formatKiev } from '../../utils/formatKiev.js';
import { broadcast } from '../../utils/broadcast.js';
import { formatBroadcastResult } from '../../helpers/formatBroadcastResult.js';

export async function setRestore(bot, msg, match) {
    if (!isAdmin(msg)) {
        await bot.sendMessage(msg.chat.id, '⛔ У вас нет доступа.');
        return;
    }

    const restoreTime = match[1]?.trim();

    if (!restoreTime) {
        await bot.sendMessage(msg.chat.id, '❗ Вкажіть час, наприклад: /restore 03:30');
        return;
    }

    const status = await Status.findOne();

    if (!status || status.light) {
        await bot.sendMessage(
            msg.chat.id,
            'ℹ️ Світло зараз є. Немає сенсу оновлювати час відновлення.'
        );
        return;
    }

    status.restore_time = restoreTime;
    status.updated = formatKiev();
    await status.save();

    const result = await broadcast(
        bot,
        msg.chat.id,
        `⚡️ Оновлення інформації\n\nОрієнтовне відновлення світла: ${restoreTime}`
    );

    await bot.sendMessage(
        msg.chat.id,
        `✅ Повідомлення надіслано\n👥 ${formatBroadcastResult(result)}`
    );
}
