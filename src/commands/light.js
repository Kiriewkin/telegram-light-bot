import { Status } from '../models/Status.js';

export async function light(bot, msg) {
    const status = await Status.findOne();

    if (!status) {
        await bot.sendMessage(msg.chat.id, '⚠️ Статус поки не налаштований.');
        return;
    }

    const text = status.light
        ? '✅ Світло є'
        : `❌ Світла нема з ${status.last_change}\n\n⚡️ Орієнтовне відновлення: ${status.restore_time}`;

    await bot.sendMessage(msg.chat.id, text);
}