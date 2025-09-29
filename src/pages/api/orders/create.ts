import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      userId,
      transactionCode,
      customerInfo,
      shippingAddress,
      deliveryDetails,
      items,
      total,
      discount,
    } = req.body;

    // Validate input
    if (!userId || !transactionCode || !customerInfo || !shippingAddress || !deliveryDetails || !items || !total) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Simulate order creation logic
    const orderNumber = `JNC-${Date.now()}`;

    // Respond with success
    res.status(200).json({ success: true, orderNumber });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}