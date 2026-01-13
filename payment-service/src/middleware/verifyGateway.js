import logger from '../utils/logger.js'
import ApiError from '../errors/customAPIError.js'

const authRoutes = async (req,res,next)=>{
    try {
        const userId = req.headers["x-user-id"]
        const role = req.headers["x-user-role"]
        
        if(!userId){
            logger.warn('Unauthorized access')
            throw new ApiError(401,'Unauthorized access')
        }

        req.user = {userId ,role}
        next()
    } catch (error) {
        logger.error('Error occured in authentication')
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        })
    }
}

export default authRoutes