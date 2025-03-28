import { Response, Request, NextFunction } from 'express';
import env from '../../../utils/env';
import { AuthService } from '../types';
import { ExchangeGoogleTokenBody, LogoutRequestBody, RefreshTokenRequestBody } from './dto';
import { BaseController } from '../../../shared/base-controller';
import responseValidationError from '../../../shared/response';
import { HttpRequest } from '../../../types';



class AuthController extends BaseController {
  service: AuthService;

  constructor(service: AuthService) {
    super();
    this.service = service;
  }

  async exchangeGoogleToken(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res, _next) => {
      const exchangeGoogleTokenBody = new ExchangeGoogleTokenBody(req.query);

      const validateResult = await exchangeGoogleTokenBody.validate();
      if (!validateResult.ok) {
        responseValidationError(res, validateResult.errors[0]);
        return;
      }

      const exchangeResult = await this.service.exchangeWithGoogleIDP({
        idp: 'google',
        code: exchangeGoogleTokenBody.code,
      });

      const params = new URLSearchParams({
        uid: exchangeResult.sub,
        access_token: exchangeResult.accessToken,
        refresh_token: exchangeResult.refreshToken
      });

      const redirectURL = `${env.CLIENT_URL}/oauth/redirect?${params.toString()}`;
      res.redirect(redirectURL);

      return;
    });
  }

  async logout(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res, _next) => {
      try {
        const logoutRequestBody = new LogoutRequestBody(req.body);
        
        const validateResult = await logoutRequestBody.validate();
        if (!validateResult.ok) {
          console.error('Validation failed: ', validateResult.errors);
          responseValidationError(res, validateResult.errors[0]);
          return;
        }

        if (!logoutRequestBody.refreshToken) {
          console.error('Missing refresh token');
          res.status(400).send({ error: 'Missing refresh token' });
          return;
        }
        
        await this.service.logout(logoutRequestBody.refreshToken);

        res.sendStatus(200);
      } catch (error) {
        console.error('Error during logout process: ', error);
        res.status(500).send({ error: 'Internal Server Error', details: error.message });
      }
    });
  }

  async refreshToken(req: Request, res: Response, _next: NextFunction): Promise<void> {
    const refreshTokenRequestBody = new RefreshTokenRequestBody(req.body);
    const validateResult = await refreshTokenRequestBody.validate();
    if (!validateResult.ok) {
      responseValidationError(res, validateResult.errors[0]);
      return;
    }

    const token = await this.service.refreshToken(refreshTokenRequestBody.refreshToken);

    res.status(200).json({
      refresh_token: token.refreshToken,
      access_token: token.accessToken,
    });

    return;
  }

  async createUser(req: Request, res: Response) {
    const userProfile = req.body;

    console.log("Nhận request tạo user:", userProfile);

    try {
        const user = await this.service.createUserIfNotExists(userProfile);
        if (!user) {
            return res.status(500).json({ error: "Không thể tạo user" });
        }

        return res.json({ message: "User created successfully", user });
    } catch (error) {
        console.error("Lỗi khi tạo user:", error);
        return res.status(500).json({ error: error.message });
    }
}
}

export {
  AuthController,
};
