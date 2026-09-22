import { Response } from 'express';

export function sendSuccess<T>(
  res: Response,
  data: T,
  message = 'OK',
  statusCode = 200,
) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

export function sendMessage(res: Response, message: string, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
  });
}
