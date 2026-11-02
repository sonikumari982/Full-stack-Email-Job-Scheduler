import type { Request, Response } from 'express';
import { env } from '../config/env';

export function getGoogleAuthUrl(_req: Request, res: Response): void {
  if (!env.googleClientId) {
    res.status(400).json({
      message: 'Google OAuth is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your env file.',
    });
    return;
  }

  const params = new URLSearchParams({
    client_id: env.googleClientId,
    redirect_uri: env.googleRedirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
  });

  res.json({
    url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
  });
}

export async function googleCallback(req: Request, res: Response): Promise<void> {
  const { code } = req.query;

  if (!code || !env.googleClientId || !env.googleClientSecret) {
    res.redirect(`${env.frontendUrl}/login?error=google_not_configured`);
    return;
  }

  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: String(code),
        client_id: env.googleClientId,
        client_secret: env.googleClientSecret,
        redirect_uri: env.googleRedirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.access_token) {
      throw new Error(tokenData.error_description || 'Unable to complete Google OAuth');
    }

    const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const profile = await profileResponse.json();

    const userToken = Buffer.from(JSON.stringify({
      name: profile.name,
      email: profile.email,
      picture: profile.picture,
    })).toString('base64');

    res.redirect(`${env.frontendUrl}/dashboard?token=${encodeURIComponent(userToken)}`);
  } catch (error: any) {
    console.error('Google OAuth callback failed:', error);
    res.redirect(`${env.frontendUrl}/login?error=oauth_failed`);
  }
}
