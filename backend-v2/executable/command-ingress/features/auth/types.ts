type ExchangeTokenResult = {
  sub: string;
  refreshToken: string;
  accessToken: string;
}

type ExchangeTokenRequest = {
  code: string;
  idp: string;
}

interface AuthService {
  exchangeWithGoogleIDP(request: ExchangeTokenRequest): Promise<ExchangeTokenResult>
  logout(token: string): Promise<void>
  refreshToken(token: string): Promise<ExchangeTokenResult>
  createUserIfNotExists(userProfile: any): Promise<any>
}


export {
  AuthService,
  ExchangeTokenRequest,
  ExchangeTokenResult,
}