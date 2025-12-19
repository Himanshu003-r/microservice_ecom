import jwt from "jsonwebtoken"
import crypto from "crypto"
import RefreshToken from "../models/RefereshToken.js"

const generateToken = async(user) => {
    const accessToken = jwt.sign({
        userId: user._id,
        username: user.username
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRATION
    })

    const refreshToken = crypto.randomBytes(40).toString('hex')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) //expires in 7days

    await RefreshToken.create({
        refreshToken : refreshToken,
        user: user._id,
        expiresAt
    })

    return {accessToken, refreshToken}
}

export default generateToken