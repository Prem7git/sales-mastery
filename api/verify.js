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

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, name, email, phone, profession } = req.body;

  // Signature verify
  const body = razorpay_order_id + '|' + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');

  if (expectedSignature !== razorpay_signature) {
    return res.status(400).json({ error: 'Payment verify nahi hua' });
  }

  try {
    // Supabase insert/update
    const { data: existing } = await supabase
      .from('registrations')
      .select('*')
      .eq('razorpay_order_id', razorpay_order_id);

    if (existing && existing.length > 0) {
      await supabase
        .from('registrations')
        .update({
          payment_status: 'paid',
          razorpay_payment_id: razorpay_payment_id
        })
        .eq('razorpay_order_id', razorpay_order_id);
    } else {
      await supabase
        .from('registrations')
        .insert({
          name, email, phone, profession,
          razorpay_order_id,
          razorpay_payment_id,
          payment_status: 'paid'
        });
    }

    // 🔥 TEMPORARY: Dono emails tujhe bhej raha hai (testing ke liye)
    // User email (actually tujhe)
    await resend.emails.send({
      from: 'Coach Shruti Tiwari <onboarding@resend.dev>',
      to: 'premtiwari1105@gmail.com',
      subject: '📧 TEST: User Email Would Go Here',
      html: `
        <h2>This is a TEST email</h2>
        <p><strong>Original user:</strong> ${name}</p>
        <p><strong>Their email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone}</p>
        <p><strong>Profession:</strong> ${profession}</p>
        <hr>
        <p>⚠️ Real user email is NOT being sent because domain is not verified in Resend.</p>
        <p>✅ Once you verify your domain, change 'to' field back to 'email' variable.</p>
      `
    });

    // Admin email
    await resend.emails.send({
      from: 'Coach Shruti Tiwari <onboarding@resend.dev>',
      to: 'premtiwari1105@gmail.com',
      subject: '💰 NEW PAYMENT RECEIVED!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0c0a0e; color: #ffffff; padding: 40px; border-radius: 12px;">
          <h2 style="color: #f0b94a;">🎉 New Registration & Payment!</h2>
          <div style="background: #1a1520; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>👤 Name:</strong> ${name}</p>
            <p><strong>📧 Email:</strong> ${email}</p>
            <p><strong>📞 Phone:</strong> ${phone}</p>
            <p><strong>💼 Profession:</strong> ${profession}</p>
            <p><strong>💰 Amount:</strong> ₹99</p>
            <p><strong>🆔 Payment ID:</strong> ${razorpay_payment_id}</p>
          </div>
        </div>
      `
    });

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error("❌ ERROR:", err);
    return res.status(500).json({ error: 'Verification mein dikkat' });
  }
};
