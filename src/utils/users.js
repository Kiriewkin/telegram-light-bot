import { User } from '../models/User.js';

export async function addUser(chatId) {
  try {
    await User.updateOne({ chatId }, { chatId }, { upsert: true });
  } catch (e) {
    console.error(e);
  }
}

export async function getUsers() {
  return await User.find({});
}