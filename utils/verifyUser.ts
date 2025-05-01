const jwt = require("jsonwebtoken")
import { NextFunction, Response } from "express";
import { errorHandler } from "./error";

export const verifyUser = (req: any, res: Response, next: NextFunction) => {
  const token = req.headers.access_token
  // console.log(token)


  if(!token) return next(errorHandler(401, 'Unauthorized, token not found!'))

  jwt.verify(token, process.env.JWT_SECRET, (err: any, decoded: any) => {
    if (err) {
      return next(errorHandler(401, 'Unauthorized'))
    }

    req.userId = decoded.id
    next()
  })
}


