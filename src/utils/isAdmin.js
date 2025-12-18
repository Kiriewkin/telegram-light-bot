import { Admin } from '../models/Admin.js';

export async function isAdmin(telegramId) {
  const admin = await Admin.findOne({ telegramId: String(telegramId) });
  return !!admin;
}

export async function isSuperAdmin(telegramId) {
  const admin = await Admin.findOne({ telegramId: String(telegramId) });
  return admin?.role === 'superadmin';
}