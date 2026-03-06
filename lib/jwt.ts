import jwt from 'jsonwebtoken';

// Get environment variables with fallbacks
const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.warn('JWT_SECRET not set, using default secret');
    return 'volidam-patir-default-secret-key-2024';
  }
  return secret;
};

const getJwtExpiresIn = (): string => {
  return process.env.JWT_EXPIRES_IN || '24h';
};

export interface JWTPayload {
  userId: string;
  username: string;
  role: string;
}

export function generateToken(payload: JWTPayload): string {
  const secret = getJwtSecret();
  const expiresIn = getJwtExpiresIn();
  return jwt.sign(payload, secret as jwt.Secret, { expiresIn } as jwt.SignOptions);
}

export function verifyToken(token: string): JWTPayload {
  const secret = getJwtSecret();
  return jwt.verify(token, secret) as JWTPayload;
}
