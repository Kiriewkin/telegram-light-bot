import { Status } from '../models/Status.js';

export async function schedule(bot, msg) {
    const status = await Status.findOne();

    if (!status || !status.scheduleImage) {
        await bot.sendMessage(msg.chat.id, '📅 Графік відключень поки не завантажений.');
        return;
    }

    await bot.sendPhoto(msg.chat.id, status.scheduleImage, {
        caption: '📅 Графік відключень світла\n\nАктуальний на сьогодні.'
    });
}