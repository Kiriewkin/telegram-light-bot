import mongoose from 'mongoose';

const AdminStateSchema = new mongoose.Schema({
  telegramId: { type: String, unique: true },
  action: { type: String },
  // час створення стану — використовується для авто‑протухання
  createdAt: { type: Date, default: Date.now },
});

export const AdminState = mongoose.model('AdminState', AdminStateSchema);