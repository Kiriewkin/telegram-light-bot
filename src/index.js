import TelegramBot from 'node-telegram-bot-api';
import express from 'express';

import { DOMEN_RAILWAY, TOKEN } from '../config.js';
import { connectToDatabase } from './db/index.js';
import { light, schedule, setlight, setschedule } from './commands/index.js'
import { addUser } from './utils/users.js';
import { Status } from './models/Status.js';
import { allowedTexts } from './utils/allowedTexts.js';
import { mainKeyboard } from './utils/keyboard.js';

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
        `Привіт! Я бот, який показує, чи є світло у ЖК «${status.name}».

Доступні команди:
• /light — перевірити, чи є світло
• /schedule — переглянути графік відключень

Або скористайтесь кнопками нижче ⬇️`,
        mainKeyboard
    );

});


bot.onText(/\/light|💡 Світло/i, (msg) => light(bot, msg));
bot.onText(/\/schedule|📅 Графік/i, (msg) => schedule(bot, msg));
bot.onText(/\/setlight (.+)/, (msg, match) => {
    setlight(bot, msg, match);
});
bot.on('photo', (msg) => {
    if (msg.caption === '/setschedule') {
        setschedule(bot, msg);
    }
});

bot.on('message', async (msg) => {
    if (!msg.text) return;

    const text = msg.text.trim();
    const command = text.split('@')[0];

    if (allowedTexts.includes(command)) return;

    // админ-команды
    if (command.startsWith('/set')) return;

    await bot.sendMessage(
        msg.chat.id,
        `❓ Я не розумію цю команду.

Скористайтесь кнопками нижче або командами:
• /light — перевірити, чи є світло
• /schedule — переглянути графік відключень

Або скористайтесь кнопками нижче ⬇️`,
        mainKeyboard
    );
});

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
