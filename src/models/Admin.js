import mongoose from 'mongoose';

const AdminSchema = new mongoose.Schema({
  telegramId: { type: String, unique: true },
  role: { type: String, enum: ['admin', 'superadmin'], default: 'admin' }
});

export const Admin = mongoose.model('Admin', AdminSchema);
