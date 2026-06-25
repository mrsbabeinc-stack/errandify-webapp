import axios from 'axios';
import { config } from '../config.js';

interface SingPassUserData {
  nric: string;
  name: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender?: string; // M or F from SingPass
}

interface SingPassConfig {
  clientId: string;
  redirectUri: string;
  environment: 'staging' | 'production';
  jwksEndpoint: string;
}

export class SingPassService {
  private config: SingPassConfig;
  private baseUrl: string;

  constructor() {
    this.config = {
      clientId: process.env.SINGPASS_CLIENT_ID || 'STG-202531346W-LOGIN-Errand-d8ZpLL',
      redirectUri: process.env.SINGPASS_REDIRECT_URI || 'https://app-dev.errandify.ai/register-sing-pass',
      environment: (process.env.SINGPASS_ENVIRONMENT as 'staging' | 'production') || 'staging',
      jwksEndpoint: process.env.SINGPASS_JWKS_ENDPOINT || 'https://api-dev.errandify.ai/api/.well-known/jwks.json',
    };

    this.baseUrl = this.config.environment === 'staging'
      ? 'https://api-dev.singpass.gov.sg'
      : 'https://api.singpass.gov.sg';
  }

  /**
   * Generate SingPass authorization URL
   */
  getAuthorizationUrl(): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: 'openid email mobile profile',
      state: this.generateState(),
      nonce: this.generateNonce(),
    });

    return `${this.baseUrl}/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string): Promise<any> {
    try {
      console.log('[SingPass] Exchanging code for token...');

      const response = await axios.post(
        `${this.baseUrl}/oauth/token`,
        {
          grant_type: 'authorization_code',
          code,
          client_id: this.config.clientId,
          redirect_uri: this.config.redirectUri,
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      console.log('[SingPass] Token received successfully');
      return response.data;
    } catch (error) {
      console.error('[SingPass] Failed to exchange code for token:', error);
      throw new Error('Failed to exchange authorization code');
    }
  }

  /**
   * Get user information using access token
   */
  async getUserData(accessToken: string): Promise<SingPassUserData> {
    try {
      console.log('[SingPass] Fetching user data...');

      const response = await axios.get(
        `${this.baseUrl}/userinfo`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      const userData = response.data;

      const formattedData: SingPassUserData = {
        nric: userData.sub || userData.nric,
        name: userData.name || '',
        email: userData.email || '',
        phone: userData.phone_number || userData.mobile || '',
        dateOfBirth: userData.birthdate || '',
        gender: userData.gender || userData.sex || '', // SingPass may use 'gender' or 'sex'
      };

      console.log('[SingPass] User data retrieved successfully');
      return formattedData;
    } catch (error) {
      console.error('[SingPass] Failed to fetch user data:', error);
      throw new Error('Failed to retrieve user information');
    }
  }

  /**
   * Handle complete OAuth flow
   */
  async handleOAuthCallback(code: string): Promise<SingPassUserData> {
    try {
      const tokenResponse = await this.exchangeCodeForToken(code);
      const accessToken = tokenResponse.access_token;

      const userData = await this.getUserData(accessToken);

      console.log('[SingPass] OAuth flow completed successfully');
      return userData;
    } catch (error) {
      console.error('[SingPass] OAuth callback failed:', error);
      throw error;
    }
  }

  /**
   * Generate random state parameter for CSRF protection
   */
  private generateState(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  /**
   * Generate random nonce parameter
   */
  private generateNonce(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}

export const singpassService = new SingPassService();
