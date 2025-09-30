import { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const signature = req.headers['x-paystack-signature'];

  if (!signature) {
    return res.status(400).json({ error: 'Missing Paystack signature' });
  }

  const hash = crypto
    .createHmac('sha512', PAYSTACK_SECRET_KEY || '')
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (hash !== signature) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  try {
    const event = req.body;

    // Handle the event based on its type
    switch (event.event) {
      case 'charge.success':
        // Payment was successful
        console.log('Payment successful:', event.data);
        // Update your database or perform other actions here
        break;

      case 'charge.failed':
        // Payment failed
        console.log('Payment failed:', event.data);
        break;

      default:
        console.log('Unhandled event type:', event.event);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}