import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'volidam-patir-default-secret-key-2024';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

export interface JWTPayload {
  userId: string;
  username: string;
  role: string;
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JWTPayload {
  return jwt.verify(token, JWT_SECRET) as JWTPayload;
}
