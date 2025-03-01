/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';
import qs from 'qs';

type TokenResponse = {
  accessToken: string;
  idToken: string;
};

class GoogleIdentityBroker {
  clientID: string;
  clientSecret: string;
  redirectURL: string;

  constructor(data: {
    clientID: string,
    clientSecret: string,
    redirectURL: string,
  }) {
    const { clientID, clientSecret, redirectURL } = data;

    if (!clientID) {
      throw new Error('Missing Google clientID');
    }

    if (!clientSecret) {
      throw new Error('Missing Google client secret');
    }

    if (!redirectURL) {
      throw new Error('Missing redirectURL');
    }

    this.clientID = data.clientID;
    this.clientSecret = data.clientSecret;
    this.redirectURL = data.redirectURL;
  }

  async exchangeAuthorizationCode(code: string): Promise<TokenResponse> {
    const url = 'https://oauth2.googleapis.com/token';
    const values = {
      code,
      client_id: this.clientID,
      client_secret: this.clientSecret,
      redirect_uri: this.redirectURL,
      grant_type: 'authorization_code',
    };

    const res = await axios.post(url, qs.stringify(values), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    return {
      accessToken: res.data.access_token,
      idToken: res.data.id_token,
    };
  }

  async fetchProfile(data: {
    idToken: string;
    accessToken: string;
  }): Promise<any> {
    const res = await axios
    .get(
      `https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${data.accessToken}`,
      {
        headers: {
          Authorization: `Bearer ${data.idToken}`,
        },
      }
    );

    return res.data;
  }
};

export {
  TokenResponse,
  GoogleIdentityBroker,
}