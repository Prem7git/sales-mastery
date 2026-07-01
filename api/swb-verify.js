const crypto = require("crypto");
const nodemailer = require("nodemailer");

async function getZoomJoinLink(name, email) {
  try {
    // Step A: Access token lo
    const tokenRes = await fetch(
      `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${process.env.ZOOM_ACCOUNT_ID}`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(
            `${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`
          ).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // Step B: Participant ko meeting mein register karo
    const regRes = await fetch(
      `https://api.zoom.us/v2/meetings/${process.env.ZOOM_MEETING_ID}/registrants`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          first_name: name.split(' ')[0],
          last_name: name.split(' ').slice(1).join(' ') || '.',
          email: email
        })
      }
    );
    const regData = await regRes.json();
    return regData.join_url || null;

  } catch (err) {
    console.error('Zoom API error:', err);
    return null;
  }
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const {
      razorpay_order_id, razorpay_payment_id, razorpay_signature,
      name, email, phone, profession,
    } = req.body;
    // 1. VERIFY SIGNATURE
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body).digest("hex");
    if (expected !== razorpay_signature) {
      return res.status(400).json({ success: false, error: "Invalid signature" });
    }
    const timestamp = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    // 2. GOOGLE SHEET
    try {
      await fetch(process.env.GOOGLE_SHEET_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, email, profession,
          payment_id: razorpay_payment_id, order_id: razorpay_order_id,
          amount: "₹199", timestamp, source: "Sales Warrior Blueprint" }),
      });
    } catch (e) { console.error("Sheet error:", e); }

    // Zoom unique link lo
    const zoomJoinUrl = await getZoomJoinLink(name, email);

    // 3. EMAIL
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });
    await transporter.sendMail({
      from: `"Coach Shruti Website" <${process.env.EMAIL_USER}>`,
      to: process.env.ADMIN_EMAIL,
      subject: `💰 New Registration: ${name} — ₹199`,
      html: `<p><b>Name:</b> ${name}</p><p><b>Phone:</b> ${phone}</p><p><b>Email:</b> ${email}</p><p><b>Profession:</b> ${profession}</p><p><b>Payment ID:</b> ${razorpay_payment_id}</p><p><b>Time:</b> ${timestamp}</p>`,
    });
    await transporter.sendMail({
      from: `"Coach Shruti Tiwari" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "✅ Seat Confirmed! — Sales Warrior Blueprint",
      html: `<div style="font-family:Arial,sans-serif;max-width:540px;margin:auto;">
        <div style="background:#1e1030;padding:24px;text-align:center;border-radius:12px 12px 0 0;">
          <h1 style="color:#edb84e;">Sales Warrior Blueprint</h1>
        </div>
        <div style="background:#fff;padding:28px;border-radius:0 0 12px 12px;border:1px solid #eee;">
          <h2 style="color:#1e1030;">Hi ${name}! 🎉</h2>
          <p style="color:#555;">Your seat is confirmed!</p>
          <div style="background:#fdf0d4;border-left:4px solid #c8923a;padding:16px;border-radius:4px;margin:20px 0;">
            📅 <b>Dates:</b> July 12th, 13th &amp; 14th 2026<br>
            🕙 <b>Time:</b> 07:30 PM IST<br>
            📍 <b>Venue:</b> Live on Zoom<br>
            🌐 <b>Language:</b> Hinglish
          </div>
          <p>🔗 <strong>Your Unique Zoom Link:</strong> <a href="${zoomJoinUrl}" style="color:#F5C542;">${zoomJoinUrl || 'Will be sent separately'}</a></p>
          <p style="color:#ff8888;font-size:12px;">⚠️ This link is unique to you. Do not share it with anyone.</p>
          <a href="https://chat.whatsapp.com/I7BDmR0YXP74FhNIMYVgun"
             style="display:inline-block;background:#25D366;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">
            👉 Join WhatsApp Group
          </a>
          <p style="color:#888;font-size:13px;margin-top:20px;"><b>Payment ID:</b> ${razorpay_payment_id}</p>
          <p style="color:#888;font-size:13px;"> - Team Shruti Tiwari</p>
        </div>
      </div>`,
    });
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Verify error:", err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};
