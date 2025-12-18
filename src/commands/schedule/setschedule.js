import cloudinary from '../../../config.js';
import { isAdmin } from '../../utils/isAdmin.js';
import { Status } from '../../models/Status.js';
import { formatKiev } from '../../utils/formatKiev.js';
import { broadcastPhoto } from '../../utils/broadcastPhoto.js';
import { formatBroadcastResult } from '../../helpers/formatBroadcastResult.js';

export async function setschedule(bot, msg) {
    if (!(await isAdmin(msg.from.id))) {
        await bot.sendMessage(msg.chat.id, '⛔ Немає доступу');
        return;
    }

    if (!msg.photo) {
        await bot.sendMessage(msg.chat.id, '📸 Надішліть фото з графіком.');
        return;
    }

    const photo = msg.photo[msg.photo.length - 1];
    const file = await bot.getFile(photo.file_id);

    const telegramUrl = `https://api.telegram.org/file/bot${process.env.TOKEN}/${file.file_path}`;

    // 🚀 Загрузка в Cloudinary
    const upload = await cloudinary.uploader.upload(telegramUrl, {
        folder: 'telegram-light-bot',
        public_id: 'schedule',
        overwrite: true
    });

    let status = await Status.findOne();
    if (!status) status = new Status({ name: 'ЖК' });

    const now = formatKiev();

    status.scheduleImage = upload.secure_url;
    status.updated = now;
    status.last_change = now;
    await status.save();

    // ✅ Отправляем сообщение всем пользователям
    const caption = `📅 Оновлено графік відключень!\n🕒 ${now}`;
    const result = await broadcastPhoto(
        bot,
        msg.chat.id,
        status.scheduleImage,
        caption
    );

    await bot.sendMessage(msg.chat.id, formatBroadcastResult(result));
}
