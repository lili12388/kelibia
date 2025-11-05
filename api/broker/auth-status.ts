import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const token = req.cookies?.broker_token;
    const secret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    
    if (token) {
      try {
        const decoded = jwt.verify(token, secret) as { isBroker: boolean };
        if (decoded.isBroker) {
          return res.status(200).json({ isAuthenticated: true });
        }
      } catch (error) {
        // Token invalid or expired
      }
    }
    
    return res.status(200).json({ isAuthenticated: false });
  } catch (error) {
    console.error('Auth status error:', error);
    return res.status(500).json({ error: 'Failed to check auth status' });
  }
}
