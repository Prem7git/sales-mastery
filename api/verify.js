const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, name, email, phone, profession } = req.body;

  console.log("🔍 DEBUG - Email received:", email);
  console.log("🔍 DEBUG - Name received:", name);

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
    // Supabase save
    await supabase.from('registrations').insert({
      name, email, phone, profession,
      razorpay_order_id, razorpay_payment_id,
      payment_status: 'paid'
    });

    // ✅ USER EMAIL
    if (email && email.includes('@')) {
      const userEmail = await resend.emails.send({
        from: 'Coach Shruti Tiwari <onboarding@resend.dev>',
        to: email,
        subject: '✅ Registration Confirmed — Sales Mastery Session',
        html: `<h2>Welcome ${name}!</h2><p>Your session is confirmed for Sunday 7 PM.</p>`
      });
      console.log("✅ USER EMAIL SENT to:", email, "ID:", userEmail.id);
    } else {
      console.log("❌ USER EMAIL SKIPPED - Invalid email:", email);
    }

    // ✅ ADMIN EMAIL
    const adminEmail = await resend.emails.send({
      from: 'Coach Shruti Tiwari <onboarding@resend.dev>',
      to: 'premtiwari1105@gmail.com',
      subject: '💰 New Payment Received!',
      html: `<p>${name} (${email}) paid ₹99</p>`
    });
    console.log("✅ ADMIN EMAIL SENT:", adminEmail.id);

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error("❌ ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
};
