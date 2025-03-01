import { describe, expect } from '@jest/globals'
import { ExchangeGoogleTokenBody, RefreshTokenRequestBody } from './dto';

describe('Validator test', function() {
  it('Should return error if the GoogleOAuthBody is invalid', async () => {
    const body = {
      code: '',
    };

    const dto = new ExchangeGoogleTokenBody(body);
    const res = await dto.validate();

    expect(res).not.toBeNull();
    expect(res.ok).toBe(false);
    expect(res.errors).toHaveLength(1);
  });

  it('Should return error if user refresh token without providing it', async () => {
    const body = {
      refresh_token: '',
    };

    const dto = new RefreshTokenRequestBody(body);
    const res = await dto.validate();

    expect(res).not.toBeNull();
    expect(res.ok).toBe(false);
    expect(res.errors).toHaveLength(1);
  });

  it('Should return error if the logout request is invalid', async () => {
    const body = {
      refresh_token: 'abc',
    };

    const dto = new RefreshTokenRequestBody(body);
    const res = await dto.validate();

    expect(res).not.toBeNull();
    expect(res.ok).toBe(false);

    console.log(res.errors);

    expect(res.errors).toHaveLength(1);
    expect(Object.values(res.errors[0]))
      .toContainEqual({ jsonwebtoken: 'Invalid JSON Web Token format' });
  });

  it('Should be okay when token is valid', async () => {
    const body = {
      refresh_token: 'ey.body.signature',
    };

    const dto = new RefreshTokenRequestBody(body);
    const res = await dto.validate();

    expect(res).not.toBeNull();
    expect(res.ok).toBe(true);
    expect(res.errors).toHaveLength(0);
  });

});