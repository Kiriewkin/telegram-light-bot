import mongoose from 'mongoose';

const AdminStateSchema = new mongoose.Schema({
  telegramId: { type: String, unique: true },
  action: { type: String },
});

export const AdminState = mongoose.model('AdminState', AdminStateSchema);