import mongoose from 'mongoose';

const statusSchema = new mongoose.Schema({
    name: String,
    light: Boolean,
    last_change: String,
    restore_time: String,
    updated: String,
    scheduleImage: {
        type: String,
        default: null
    }
},
    {
        collection: "status"
    }
);

export const Status = mongoose.model('Status', statusSchema);
