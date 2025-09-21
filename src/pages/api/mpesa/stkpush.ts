// pages/api/mpesa/stkpush.js


import type { NextApiRequest, NextApiResponse } from 'next';
import { getAccessToken } from '@/lib/mpesa';

function getTimestamp(): string {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return (
    d.getFullYear().toString() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}

function normalizePhone(number: string): string {
  if (number.startsWith('0')) return `254${number.slice(1)}`;
  if (number.startsWith('+')) return number.slice(1);
  return number;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { phone, amount, accountReference = 'TestAccount' } = req.body;
  if (!phone || !amount) {
    return res.status(400).json({ error: 'phone and amount are required' });
  }

  try {
    const token = await getAccessToken();
    const timestamp = getTimestamp();
    const shortcode = process.env.BUSINESS_SHORTCODE!;
    const passkey = process.env.PASSKEY!;

    const password = Buffer.from(shortcode + passkey + timestamp).toString('base64');
    const msisdn = normalizePhone(phone);

    const base =
      process.env.ENVIRONMENT === 'production'
        ? 'https://api.safaricom.co.ke'
        : 'https://sandbox.safaricom.co.ke';

    const body = {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: amount,
      PartyA: msisdn,
      PartyB: shortcode,
      PhoneNumber: msisdn,
      CallBackURL: process.env.CALLBACK_URL!,
      AccountReference: accountReference,
      TransactionDesc: 'Test Payment',
    };

    const mpesaRes = await fetch(`${base}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await mpesaRes.json();
    res.status(mpesaRes.ok ? 200 : 500).json(data);
  } catch (err: any) {
    console.error('STK push error:', err);
    res.status(500).json({ error: err.message });
  }
}
