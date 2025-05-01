import { NextFunction, Request, Response } from "express"

interface Error {
  statusCode?: number;
  message?: string;
}

const errorHandler = (statusCode: number, message: string) => {
  const error =new Error() as Error
  error.statusCode = statusCode
  error.message = message

  return error
}

const errorResponse = (err: Error, req: Request, res:Response, next: NextFunction) => {
  const statusCode = err?.statusCode || 500
  const message = err.message || 'Internal Server Error'
  res.status(statusCode).json({
    success: false,
    statusCode,
    message
  })

}

export {errorHandler, errorResponse} 