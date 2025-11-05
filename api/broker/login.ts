import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { password } = req.body;
    
    const BROKER_PASSWORD = process.env.BROKER_PASSWORD || 'broker123';
    
    if (password === BROKER_PASSWORD) {
      const secret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
      const token = jwt.sign(
        { isBroker: true, isAuthenticated: true },
        secret,
        { expiresIn: '24h' }
      );
      
      // Set cookie
      res.setHeader('Set-Cookie', `broker_token=${token}; HttpOnly; Secure; SameSite=Lax; Max-Age=86400; Path=/`);
      
      return res.status(200).json({ success: true });
    } else {
      return res.status(401).json({ error: 'Invalid password' });
    }
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Login failed' });
  }
}
