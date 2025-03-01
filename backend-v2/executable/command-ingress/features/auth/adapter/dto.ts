import { Length, validate, ValidationError } from 'class-validator';
import { ValidationResult } from '../../../shared/validation';

export class RequestDto {
  async validate(): Promise<ValidationResult> {
    try {
      const validationErrors = await validate(this, { forbidUnknownValues: false });

      if (validationErrors && validationErrors.length > 0) {
        return {
          ok: false,
          errors: validationErrors,
        };
      }

      return { ok: true, errors: [] };
    } catch (_: any) {
      return { ok: false, errors: [] };
    }
  }
}


export class ExchangeGoogleTokenBody extends RequestDto {
  @Length(1)
  code: string;

  constructor(body: any) {
    super();
    if (body && body.code) {
      this.code = String(body.code);
    }
  }
}

export class LogoutRequestBody extends RequestDto {
  constructor(body: any) {
    super();
    console.log('45: ', body);
    if (body && body.refresh_token) {
      this.refreshToken = String(body.refresh_token);
    }
  }

  @Length(1)
  refreshToken: string;
}

export class RefreshTokenRequestBody extends RequestDto {
  constructor(body: any) {
    super();
    if (body && body.refresh_token) {
      this.refreshToken = body.refresh_token;
    }
  }

  @Length(1)
  refreshToken: string;

  async validate(): Promise<ValidationResult> {
    const result = await super.validate();
    if (!result.ok) {
      return result;
    }

    // Adding another logic, token must have three parts, which are seprated by a dot.
    const parts = this.refreshToken.split('.');
    if (parts.length != 3) {
      const tokenInvalidError = new ValidationError();
      tokenInvalidError.constraints = {
        'jsonwebtoken': 'Invalid JSON Web Token format',
      };

      return {
        ok: false,
        errors: [tokenInvalidError],
      };
    }

    return {
      ok: true,
      errors: [],
    }
  }
}