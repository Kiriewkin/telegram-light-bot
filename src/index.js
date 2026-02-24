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
import { formatKiev } from './utils/formatKiev.js';

const ADMIN_STATE_TTL_MS = 15 * 60 * 1000; // 15 хвилин на завершення дії

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
    // ✅ 1. Сразу отвечаем на callback, чтобы убрать "часик"
    bot.answerCallbackQuery(query.id).catch((err) => {
        // игнорируем только "query is too old / invalid", остальные логируем
        if (
            !(
                err?.code === 'ETELEGRAM' &&
                /query is too old|query ID is invalid/i.test(err.message || '')
            )
        ) {
            console.error('Error answering callback (initial):', err);
        }
    });

    try {
        const chatId = query.message.chat.id;
        const adminId = String(query.from.id); // саме користувач, який натиснув кнопку

        if (!(await isAdmin(adminId))) {
            // опционально можно показать алерт или просто сообщение
            await bot.sendMessage(chatId, '⛔ Немає доступу');
            return;
        }

        switch (query.data) {
            case 'light_on': {
                // ✅ не блокируем обработчик — запускаем "в фоне"
                setlight(bot, { chat: { id: chatId }, from: query.from }, { 1: 'on' })
                    .catch(err => console.error('setlight on error:', err));
                break;
            }

            case 'light_off': {
                setlight(bot, { chat: { id: chatId }, from: query.from }, { 1: 'off' })
                    .catch(err => console.error('setlight off error:', err));
                break;
            }

            case 'restore_time':
                await AdminState.findOneAndUpdate(
                    { telegramId: adminId },
                    { action: 'restore_time', createdAt: new Date() },
                    { upsert: true }
                );
                await bot.sendMessage(chatId, '✍️ Напишіть новий час відновлення:', {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '❌ Скасувати дію', callback_data: 'cancel_state' }],
                        ]
                    }
                });
                break;

            case 'broadcast':
                await AdminState.findOneAndUpdate(
                    { telegramId: adminId },
                    { action: 'broadcast', createdAt: new Date() },
                    { upsert: true }
                );
                await bot.sendMessage(chatId, '✍️ Введіть текст для розсилки:', {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '❌ Скасувати дію', callback_data: 'cancel_state' }],
                        ]
                    }
                });
                break;

            case 'update_schedule':
                await AdminState.findOneAndUpdate(
                    { telegramId: adminId },
                    { action: 'update_schedule', createdAt: new Date() },
                    { upsert: true }
                );
                await bot.sendMessage(chatId, '📸 Надішліть фото з новим графіком:', {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '❌ Скасувати дію', callback_data: 'cancel_state' }],
                        ]
                    }
                });
                break;

            case 'help':
                await bot.sendMessage(chatId, helpText());
                break;

            case 'silent_light': {
                await bot.sendMessage(chatId, '🤫 Оберіть режим для тихої зміни світла:', {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '💡 Світло: увімкнено', callback_data: 'silent_light_on' }],
                            [{ text: '❌ Світло: вимкнено', callback_data: 'silent_light_off' }],
                        ]
                    }
                });
                break;
            }

            case 'silent_light_on': {
                await AdminState.findOneAndUpdate(
                    { telegramId: adminId },
                    { action: 'silent_light_on', createdAt: new Date() },
                    { upsert: true }
                );
                await bot.sendMessage(
                    chatId,
                    '✍️ Введіть, будь ласка, час коли зʼявилось світло (наприклад: "10:30" або "09.02.2026 10:30")',
                    {
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: '❌ Скасувати дію', callback_data: 'cancel_state' }],
                            ]
                        }
                    }
                );
                break;
            }

            case 'silent_light_off': {
                await AdminState.findOneAndUpdate(
                    { telegramId: adminId },
                    { action: 'silent_light_off', createdAt: new Date() },
                    { upsert: true }
                );
                await bot.sendMessage(
                    chatId,
                    '✍️ Введіть, будь ласка, час коли зникло світло (наприклад: "08:15" або "09.02.2026 08:15")',
                    {
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: '❌ Скасувати дію', callback_data: 'cancel_state' }],
                            ]
                        }
                    }
                );
                break;
            }

            case 'cancel_state': {
                await AdminState.deleteOne({ telegramId: adminId });
                await bot.sendMessage(chatId, '❌ Поточну дію скасовано.');
                break;
            }

            default:
                break;
        }
    } catch (err) {
        console.error('Error in callback_query handler:', err);
    }
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
            // перевірка протухання стану
            const createdAt = state.createdAt ? state.createdAt.getTime() : null;
            if (createdAt && Date.now() - createdAt > ADMIN_STATE_TTL_MS) {
                await AdminState.deleteOne({ telegramId: String(msg.from.id) });
                await bot.sendMessage(
                    msg.chat.id,
                    '⏱ Час на виконання попередньої адмін‑дії вичерпано. Почніть ще раз з меню /admin.'
                );
                return;
            }

            if (state.action === 'restore_time') {
                await setRestore(bot, msg, { 1: msg.text });
            }

            if (state.action === 'broadcast') {
                await sendMessage(bot, msg, { 1: msg.text });
            }

            if (state.action === 'update_schedule') {
                await setschedule(bot, msg);
            }

            if (state.action === 'silent_light_on' || state.action === 'silent_light_off') {
                const isOn = state.action === 'silent_light_on';
                const statusTextTime = msg.text?.trim();

                let status = await Status.findOne();
                if (!status) {
                    status = new Status({ name: 'ЖК' });
                }

                status.light = isOn;
                // час зміни беремо з вводу адміна
                if (statusTextTime) {
                    status.last_change = statusTextTime;
                }

                // якщо увімкнули світло — скидаємо restore_time
                if (isOn) {
                    status.restore_time = '—';
                }

                status.updated = formatKiev();
                await status.save();

                await bot.sendMessage(
                    msg.chat.id,
                    `✅ Статус світла оновлено в тихому режимі (${isOn ? 'увімкнено' : 'вимкнено'}) без розсилки.`
                );
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
