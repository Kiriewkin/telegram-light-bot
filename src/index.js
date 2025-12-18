import TelegramBot from 'node-telegram-bot-api';
import express from 'express';

import { DOMEN_RAILWAY, TOKEN } from '../config.js';
import { connectToDatabase } from './db/index.js';
import { light, schedule, setlight, setschedule, sendMessage, setRestore } from './commands/index.js'
import { addUser } from './utils/users.js';
import { Status } from './models/Status.js';
import { allowedTexts, fallbackText, helpText, startText } from './utils/Texts.js';
import { adminKeyboard, mainKeyboard } from './utils/keyboard.js';
import { isAdmin, isSuperAdmin } from './utils/isAdmin.js';
import { Admin } from './models/Admin.js';
import { AdminState } from './models/AdminState.js';

const bot = new TelegramBot(TOKEN, { polling: true });

connectToDatabase();

// ✅ Устанавливаем меню команд (кнопка слева от поля ввода)
bot.setMyCommands([
    { command: '/start', description: 'Привітання та меню' },
    { command: '/light', description: 'Перевірити, чи є світло' },
    { command: '/schedule', description: 'Графік відключень' }
]);

// Обработчики команд
bot.onText(/\/start/, async (msg) => {
    await addUser(msg.chat.id);

    let status = await Status.findOne();

    await bot.sendMessage(
        msg.chat.id,
        startText(status.name),
        mainKeyboard
    );

});

bot.onText(/\/light|💡 Світло/i, (msg) => light(bot, msg));
bot.onText(/\/schedule|📅 Графік/i, (msg) => schedule(bot, msg));
bot.onText(/\/setlight (.+)/, async (msg, match) => {
    await setlight(bot, msg, match);
});

// изменить фото в /schedule(графік)
bot.on('photo', (msg) => {
    if (msg.caption === '/setschedule') {
        setschedule(bot, msg);
    }
});

// изменить время восстановления электроэнергии
bot.onText(/\/restore (.+)/, (msg, match) => {
    setRestore(bot, msg, match);
});

// отправить сообщение юзерам /message
bot.onText(/\/message (.+)/, (msg, match) => {
    sendMessage(bot, msg, match);
});

// вызов админ клавиатуры
bot.onText(/\/admin/, async (msg) => {
    if (!(await isAdmin(msg.from.id))) {
        await bot.sendMessage(msg.chat.id, '⛔ У вас не має доступа к адмін-панелі');
        return;
    }

    await bot.sendMessage(
        msg.chat.id,
        '🔐 Адмін-панель',
        adminKeyboard
    );
});

bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const adminId = query.from.id; // саме користувач, який натиснув кнопку

    if (!(await isAdmin(query.from.id))) {
        return bot.answerCallbackQuery(query.id, {
            text: '⛔ Немає доступу'
        });
    }

    switch (query.data) {
        case 'light_on':
            await setlight(bot, { chat: { id: chatId }, from: query.from }, { 1: 'on' });
            break;

        case 'light_off':
            await setlight(bot, { chat: { id: chatId }, from: query.from }, { 1: 'off' });
            break;

        case 'restore_time':
            await AdminState.findOneAndUpdate(
                { telegramId: adminId },
                { action: 'restore_time' },
                { upsert: true }
            );

            await bot.sendMessage(
                chatId,
                '✍️ Напишіть новий час відновлення:'
            );
            break;

        case 'broadcast':
            await AdminState.findOneAndUpdate(
                { telegramId: adminId },
                { action: 'broadcast' },
                { upsert: true }
            );

            await bot.sendMessage(
                chatId,
                '✍️ Введіть текст для розсилки:'
            );
            break;

        case 'update_schedule':
            await AdminState.findOneAndUpdate(
                { telegramId: adminId },
                { action: 'update_schedule' },
                { upsert: true }
            );
            await bot.sendMessage(chatId, '📸 Надішліть фото з новим графіком:');
            break;

        case 'help':
            await bot.sendMessage(chatId, helpText());
            break;

        default:
            break;
    }

    await bot.answerCallbackQuery(query.id);
});

// добавление админов
bot.onText(/\/addadmin (\d+)/, async (msg, match) => {
    if (!(await isSuperAdmin(msg.from.id))) {
        return bot.sendMessage(msg.chat.id, '⛔ У вас нет прав супер-админа');
    }

    const telegramId = String(match[1]);

    // нельзя добавить самого себя
    if (telegramId === String(msg.from.id)) {
        return bot.sendMessage(
            msg.chat.id,
            '⚠️ Ви вже є супер-адміном'
        );
    }

    const exists = await Admin.findOne({ telegramId });

    if (exists) {
        return bot.sendMessage(
            msg.chat.id,
            `⚠️ Користувач з ID ${telegramId} вже є адміном (${exists.role})`
        );
    }

    await Admin.create({ telegramId, role: 'admin' });

    await bot.sendMessage(
        msg.chat.id,
        `✅ Адмін доданий\nID: ${telegramId}`
    );
});

bot.on('message', async (msg) => {
    if (!msg.text && !msg.photo) return;

    // 1️⃣ admin-state
    if (await isAdmin(msg.from.id)) {
        const state = await AdminState.findOne({
            telegramId: String(msg.from.id)
        });

        if (state) {
            if (state.action === 'restore_time') {
                await setRestore(bot, msg, { 1: msg.text });
            }

            if (state.action === 'broadcast') {
                await sendMessage(bot, msg, { 1: msg.text });
            }

            if (state.action === 'update_schedule') {
                await setschedule(bot, msg);
            }

            await AdminState.deleteOne({ telegramId: String(msg.from.id) });
            return; // ⛔️ ОЧЕНЬ ВАЖНО
        }
    }

    // 2️⃣ fallback
    if (msg.text) {
        const text = msg.text.trim();

        if (text.startsWith('/')) {
            const command = text.split(' ')[0].split('@')[0];
            if (allowedTexts.includes(command)) return;
            if (command.startsWith('/set')) return;
            if (command === '/message') return;
            if (command === '/admin') return;
        }

        if (allowedTexts.includes(text)) return;

        await bot.sendMessage(msg.chat.id, fallbackText(), mainKeyboard);
    }
});

// Mini express server //
const app = express();
const PORT = 3000;

app.get('/', (req, res) => res.send('Bot is alive! 🌟'));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// --- Самопинг каждые 15 минут ---
setInterval(() => {
    fetch(DOMEN_RAILWAY)
        .then(res => console.log('Pinged self, status:', res.status))
        .catch(err => console.log('Ping error:', err));
}, 15 * 60 * 1000);
