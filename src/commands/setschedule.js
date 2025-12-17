import cloudinary from '../../config.js';
import { isAdmin } from '../utils/isAdmin.js';
import { Status } from '../models/Status.js';
import { formatKiev } from '../utils/formatKiev.js';

export async function setschedule(bot, msg) {
    if (!isAdmin(msg)) {
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

    status.scheduleImage = upload.secure_url;
    status.updated = formatKiev();
    await status.save();

    await bot.sendMessage(msg.chat.id, '✅ Графік оновлено.');
}
