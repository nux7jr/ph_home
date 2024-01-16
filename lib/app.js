"use strict";
require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { KeyboardButton, ReplyKeyboardMarkup } = require('node-telegram-bot-api');
const CronJob = require('cron').CronJob;
const allUsers = require('../config/profiles');
let currentIdUser = 0;
let isUserGotOut = false;
const token = process.env.TOKEN;
const bot = new TelegramBot(token, { polling: true });
const completedTasks = {};
const tasks = ['Помыть полы', 'Убрать кухню', 'Вынести мусор', 'Обслужить пылесос'];
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const currentUser = allUsers[currentIdUser];
    const dailyReminderJob = new CronJob('0 19 * * 0-4,6', () => {
        if (!isUserGotOut) {
            const sourceKeyboard = {
                inline_keyboard: tasks.map((task, index) => [{ text: task, callback_data: `task_${index}` }])
            };
            // Фильтрация выполненных задач
            const keyboard = {
                inline_keyboard: sourceKeyboard.inline_keyboard.filter((taskRow) => {
                    const taskText = taskRow[0].text;
                    return !completedTasks[chatId].has(taskText);
                })
            };
            bot.sendMessage(chatId, `Напоминаю убраться: @${currentUser.tag}`);
            bot.sendMessage(chatId, 'Что нужно сделать:', { reply_markup: keyboard });
            bot.sendMessage(chatId, 'Выберите кнопки для отметки выполненных задач:');
        }
    });
    dailyReminderJob.start();
    const keyboard = {
        inline_keyboard: tasks.map((task, index) => [{ text: task, callback_data: `task_${index}` }])
    };
    const saturdayReminderJob = new CronJob('0 19 * * 5', () => {
        bot.sendMessage(chatId, `На этой неделе убирается: @${currentUser.tag}`);
        bot.sendMessage(chatId, 'Что нужно сделать:', { reply_markup: keyboard });
        bot.sendMessage(chatId, 'Выберите кнопки для отметки выполненных задач:');
    });
    saturdayReminderJob.start();
    completedTasks[chatId] = new Set();
    bot.sendMessage(chatId, `На этой неделе убирается: @${currentUser.tag}`);
    bot.sendMessage(chatId, 'Что нужно сделать:', { reply_markup: keyboard });
    bot.sendMessage(chatId, 'Выберите кнопки для отметки выполненных задач:');
});
bot.on('callback_query', (query) => {
    const chatId = query.message.chat.id;
    const userId = query.from.id;
    if (query.from.username === allUsers[currentIdUser].tag) {
        const taskIndex = parseInt(query.data.split('_')[1], 10);
        const task = tasks[taskIndex];
        completedTasks[chatId].add(task);
        bot.sendMessage(chatId, `Пользователь @${query.from.username} выполнил задачу: ${task}`);
        if (completedTasks[chatId].size === tasks.length) {
            completedTasks[chatId] = new Set();
            bot.sendMessage(chatId, 'Поздравляю! Вы выполнили все задачи.');
            const localIndex = currentIdUser + 1;
            if (allUsers[localIndex] !== undefined) {
                currentIdUser++;
            }
            else {
                currentIdUser = 0;
            }
            isUserGotOut = true;
            bot.sendMessage(chatId, 'На след неделе убирается: @' + allUsers[currentIdUser].tag);
        }
    }
    else {
        bot.sendMessage(chatId, 'Неа. На этой неделе убирается: @' + allUsers[currentIdUser].tag);
    }
});
bot.onText(/\/list/, (msg) => {
    const chatId = msg.chat.id;
    let localUsers = [];
    allUsers.forEach((user) => {
        localUsers.push(user.name);
    });
    const listMessage = 'Юзеры хауса:\n' + localUsers.join('\n');
    bot.sendMessage(chatId, listMessage);
});
bot.onText(/\/debug/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "currentIdUser: " + currentIdUser);
    bot.sendMessage(chatId, "isUserGotOut: " + isUserGotOut);
});
bot.onText(/\/next/, (msg) => {
    const chatId = msg.chat.id;
    isUserGotOut = true;
    const localIndex = currentIdUser + 1;
    if (allUsers[localIndex] !== undefined) {
        currentIdUser++;
    }
    else {
        currentIdUser = 0;
    }
    bot.sendMessage(chatId, 'Oкей. Вы скипнули челика, теперь убирается: @' + allUsers[currentIdUser].tag);
});
bot.onText(/\/done/, (msg) => {
    const chatId = msg.chat.id;
    isUserGotOut = true;
    bot.sendMessage(chatId, 'Oкей. Вы убрались');
});
bot.onText(/\/progress/, (msg) => {
    const chatId = msg.chat.id;
    if (!isUserGotOut) {
        let keyboard = {};
        const sourceKeyboard = {
            inline_keyboard: tasks.map((task, index) => [{ text: task, callback_data: `task_${index}` }])
        };
        if (completedTasks[chatId]) {
            keyboard = {
                inline_keyboard: sourceKeyboard.inline_keyboard.filter((taskRow) => {
                    const taskText = taskRow[0].text;
                    return !completedTasks[chatId].has(taskText);
                })
            };
        }
        else {
            keyboard = sourceKeyboard;
        }
        bot.sendMessage(chatId, 'Что нужно сделать:', { reply_markup: keyboard });
        bot.sendMessage(chatId, 'Выберите кнопки для отметки выполненных задач:');
    }
    else {
        bot.sendMessage(chatId, 'Вы уже все убрали');
    }
});
bot.on("polling_error", (msg) => console.log(msg));
