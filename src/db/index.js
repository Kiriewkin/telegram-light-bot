import mongoose from "mongoose";
import { DB_NAME, MONGO_URI } from '../../config.js'

export const connectToDatabase = async () => {
  try {
    await mongoose.connect(MONGO_URI, {
      dbName: DB_NAME,
    });

    console.log('Connected to MongoDB (mongoose)');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};