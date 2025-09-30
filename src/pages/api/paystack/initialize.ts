import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { amount, email, orderNumber } = req.body;

    if (!amount || !email || !orderNumber) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const paystackResponse = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        amount: amount * 100, // Convert to kobo
        email,
        reference: orderNumber,
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const { data } = paystackResponse;

    res.status(200).json({
      success: true,
      authorizationUrl: data.data.authorization_url,
    });
  } catch (error) {
    console.error('Paystack initialization error:', error);
    res.status(500).json({
      error: 'Failed to initialize Paystack payment',
      message: error.response?.data?.message || error.message,
    });
  }
}