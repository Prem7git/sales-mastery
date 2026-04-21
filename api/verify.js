const Razorpay = require('razorpay');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

const resend = new Resend(process.env.RESEND_API_KEY);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, name, email } = req.body;

  // Signature verify karo
  const body = razorpay_order_id + '|' + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');

  if (expectedSignature !== razorpay_signature) {
    return res.status(400).json({ error: 'Payment verify nahi hua' });
  }

  try {
    // Supabase update karo
    await supabase
      .from('registrations')
      .update({
        payment_status: 'paid',
        razorpay_payment_id
      })
      .eq('razorpay_order_id', razorpay_order_id);

    // Confirmation email bhejo
    await resend.emails.send({
      from: 'Coach Shruti Tiwari <onboarding@resend.dev>',
      to: email,
      subject: '✅ Registration Confirmed — Sales Mastery Session',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0c0a0e; color: #ffffff; padding: 40px; border-radius: 12px;">
          <h1 style="color: #f0b94a; font-size: 28px;">🎉 You're In, ${name}!</h1>
          <p style="color: #cccccc; font-size: 16px; line-height: 1.6;">
            Your seat for the <strong>Sales Mastery Session</strong> is confirmed!
          </p>
          <div style="background: #1a1520; border: 1px solid #f0b94a; border-radius: 8px; padding: 24px; margin: 24px 0;">
            <p style="color: #f0b94a; font-size: 13px; letter-spacing: 2px; text-transform: uppercase; margin: 0 0 16px;">Session Details</p>
            <p style="color: #ffffff; margin: 8px 0;">📅 <strong>Date:</strong> This Sunday</p>
            <p style="color: #ffffff; margin: 8px 0;">🕙 <strong>Time:</strong> 7:00 PM – 8:30 PM</p>
            <p style="color: #ffffff; margin: 8px 0;">📍 <strong>Venue:</strong> Zoom (Live Online)</p>
            <p style="color: #ffffff; margin: 8px 0;">🔗 <strong>Zoom Link:</strong> <span style="color: #f0b94a;">Will be sent via email 24 hours before the session</span></p>
          </div>
          <p style="color: #cccccc; font-size: 14px;">
            Koi sawaal ho toh Instagram pe message karo: <a href="https://instagram.com/coachshrutitiwari" style="color: #f0b94a;">@coachshrutitiwari</a>
          </p>
          <p style="color: #f0b94a; font-size: 18px; margin-top: 32px;">See you Sunday! 🚀</p>
          <p style="color: #888; font-size: 12px;">— Coach Shruti Tiwari</p>
        </div>
      `
    });

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Verification mein dikkat' });
  }
};
