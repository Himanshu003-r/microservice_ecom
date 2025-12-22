import ApiError from "../errors/customAPIError"
import logger from "../utils/logger.js"
import jwt from 'jsonwebtoken'
export const auth = async (req,res,next) => {
    try {
        const authHeader = req.headers['authorization']
        const token = authHeader || authHeader.split(" ")[1]

        if(!token){
            logger.warn('Unauthorized access')
            throw new ApiError(401, 'Unauthorized access')
        }

       const user = jwt.verify(token, process.env.JWT_SECRET)
       req.user = user
    } catch (error) {
        logger.error('Error in authentication')
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        })
    }
}