const Razorpay = require('razorpay');
const { createClient } = require('@supabase/supabase-js');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, phone, profession } = req.body;

  if (!name || !email || !phone || !profession) {
    return res.status(400).json({ error: 'Sabhi fields bharo' });
  }

  try {
    // Razorpay order banao — ₹99 pre-fixed
    const order = await razorpay.orders.create({
      amount: 9900, // paise mein — 9900 = ₹99
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
      notes: { name, email, phone, profession }
    });

    // Supabase mein save karo
    await supabase.from('registrations').insert({
      name,
      email,
      phone,
      profession,
      razorpay_order_id: order.id,
      payment_status: 'pending'
    });

    return res.status(200).json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Order create karne mein dikkat' });
  }
};