import { ValidationError } from 'class-validator';

export type ValidationResult = {
  ok: boolean;
  errors: ValidationError[];
};
