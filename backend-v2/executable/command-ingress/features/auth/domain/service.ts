import { v4 as uuidv4 } from 'uuid';
import { AuthService, ExchangeTokenResult, ExchangeTokenRequest } from '../types';
import User from '../../../../../internal/model/user';
import Session from '../../../../../internal/model/session';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { GoogleIdentityBroker } from '../identity-broker/google-idp.broker';

export class AuthServiceImpl implements AuthService {
  googleIdentityBroker: GoogleIdentityBroker;
  jwtSecret: string;
  jwtRefreshSecret: string;

  constructor(
    googleIdentityBroker: GoogleIdentityBroker,
    jwtSecret: string,
    jwtRefreshSecret: string,
  ) {
    this.googleIdentityBroker = googleIdentityBroker;
    this.jwtSecret = jwtSecret;
    this.jwtRefreshSecret = jwtRefreshSecret;
  }

  signAccessToken(payload: any): string {
    return jwt.sign({
      ...payload,
    }, this.jwtSecret, { expiresIn: '1d' });
  }

  signRefreshToken(payload: any): string {
    return jwt.sign({ ...payload, typ: 'offline' }, this.jwtRefreshSecret, { expiresIn: '30d' });
  }

  verifyToken(token: string, secret: string): any {
    return jwt.verify(token, secret);
  }

  async createUserIfNotExists(userProfile: any): Promise<any> {
    console.log("MongoDB readyState:", mongoose.connection.readyState);
    if (mongoose.connection.readyState !== 1) {
      console.error("MongoDB chưa kết nối, không thể thực hiện truy vấn!");
      throw new Error("Database chưa kết nối");
    }

    let user = await User.findOne({ email: userProfile.email });
    console.log("Kiểm tra user:", user);  // Debug

    if (!user) {
      user = new User({
        name: userProfile.name,
        email: userProfile.email,
        avatar: userProfile.picture ?? '',
        lists: [
          {
              name: 'Reading list',
              posts: [],
              images: [],
          },
        ],
      });

      console.log("Đang tạo user mới:", user);
      
      try {
        if (mongoose.connection.readyState !== 1) {
          console.error("MongoDB chưa kết nối, không thể lưu user!");
          return null;
        }
        
        await user.save();
        console.log("User đã được lưu vào DB:", user);
      } catch (error) {
        console.error("Lỗi khi lưu user:", error);
      }
    }

    return user;
  }

  async exchangeWithGoogleIDP(request: ExchangeTokenRequest): Promise<ExchangeTokenResult> {
    const { code } = request;
    const googleToken = await this.googleIdentityBroker.exchangeAuthorizationCode(code);
    const userProfile = await this.googleIdentityBroker.fetchProfile({
      idToken: googleToken.idToken,
      accessToken: googleToken.accessToken,
    });

    const user = await this.createUserIfNotExists(userProfile);
    const sessionID = uuidv4();
    const jwtPayload = {
      _id: user._id,
      sub: user._id,
      sid: sessionID,
    };
    const accessToken = this.signAccessToken(jwtPayload);
    const refreshToken = this.signRefreshToken(jwtPayload)
    const session = new Session({ sessionID: sessionID, userID: user._id });
    try {
      await session.save();
      console.log("Session đã được lưu vào DB:", session);
    } catch (error) {
      console.error("Lỗi khi lưu session:", error);
    }

    return {
      refreshToken,
      accessToken,
      sub: String(user._id),
    };
  }

  async logout(refreshToken: string): Promise<void> {
    const jwtClaims = jwt.verify(refreshToken, this.jwtRefreshSecret);
    const sid = jwtClaims['sid'];

    await Session.deleteOne({
      sessionID: sid,
    });
  }

  async refreshToken(token: string): Promise<ExchangeTokenResult> {
    const jwtClaims = this.verifyToken(token, this.jwtRefreshSecret);
    const sessionID = jwtClaims['sid'];
    const subject = jwtClaims['sub'];

    const session = await Session.findOne({ sessionID });
    if (!session) {
      throw new Error('')
    }

    const jwtPayload = {
      _id: jwtClaims['sub'],
      sub: jwtClaims['sub'],
      sid: sessionID,
    };

    const newAccessToken = this.signAccessToken(jwtPayload);
    const newRefreshToken = this.signRefreshToken(jwtPayload);


    return {
      sub: String(subject),
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    }
  }
}
