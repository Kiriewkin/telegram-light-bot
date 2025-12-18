import dotenv from 'dotenv';
dotenv.config();

const requiredEnv = [
    'TOKEN',
    'MONGO_URI',
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
];

requiredEnv.forEach((key) => {
    if (!process.env[key]) {
        throw new Error(`❌ Missing env variable: ${key}`);
    }
});

import { v2 as cloudinary } from 'cloudinary';

export const DB_NAME = process.env.DB_NAME;
export const MONGO_URI = process.env.MONGO_URI;
export const TOKEN = process.env.TOKEN;
export const PORT = process.env.PORT || 4500;
export const DOMEN_RAILWAY = process.env.DOMEN_RAILWAY;
export const APP_MODE = process.env.APP_MODE

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default cloudinary;