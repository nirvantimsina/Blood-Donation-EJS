const dotenv = require('dotenv');
dotenv.config({ path: '../../.env' });
const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Database connected");
    } catch (error) {
        console.error("Connection Error:", error);
    }
};

module.exports = connectDB;
