import mongoose from "mongoose";
import logger from "../utils/logger.js";

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI)
        logger.info('Connected to mongodb')
    } catch (error) {
        logger.error('Error connecting to mongodb', error)
        process.exit(1)
    }
}

export default connectDB