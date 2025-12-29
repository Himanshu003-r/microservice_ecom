import ApiError from "../errors/customAPIError.js"

 const checkPermission = (reqUser,userResourceId) => {
    if(reqUser.roles === "admin"){
        return true
    }

    if(reqUser.userId === userResourceId.toString()){
        return true
    }

    throw new ApiError(401,'Unauthorized access')
}

export default checkPermission