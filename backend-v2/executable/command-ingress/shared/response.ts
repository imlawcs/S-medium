import { ValidationError } from 'class-validator';
import { Response } from 'express';

const responseValidationError = (res: Response, error: ValidationError) => {
  const message = Object.values(error.constraints)

  res.status(400).json({
    error: 'err_validation',
    message: message,
  });
};

export default responseValidationError;