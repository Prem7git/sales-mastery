const crypto     = require("crypto");
const nodemailer = require("nodemailer");

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      name, email, phone, profession,
    } = req.body;

    // ── 1. SIGNATURE VERIFY ──────────────────────────────
    const body     = razorpay_order_id + "|" + razorpay_payment_id;
    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expected !== razorpay_signature) {
      return res.status(400).json({ success: false, error: "Invalid signature" });
    }

    const timestamp = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

    // ── 2. GOOGLE SHEET ───────────────────────────────────
    try {
      await fetch(process.env.GOOGLE_SHEET_URL, {
        method: "POST",
        body: JSON.stringify({
          name,
          phone,
          email,
          profession,
          payment_id : razorpay_payment_id,
          order_id   : razorpay_order_id,
          amount     : "₹199",
          timestamp,
          source     : "Sales Warrior Blueprint",
        }),
      });
    } catch (sheetErr) {
      console.error("Sheet error (non-fatal):", sheetErr);
      // Sheet fail hone pe bhi aage chalte rahenge
    }

    // ── 3. NODEMAILER SETUP ───────────────────────────────
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,  // Gmail App Password (16 char)
      },
    });

    // ── 4. ADMIN KO NOTIFICATION EMAIL ───────────────────
    await transporter.sendMail({
      from:    `"Coach Shruti Website" <${process.env.EMAIL_USER}>`,
      to:      process.env.ADMIN_EMAIL,
      subject: `💰 New Paid Registration: ${name} — Sales Warrior Blueprint`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;">
          <div style="background:#1e1030;padding:24px;border-radius:10px 10px 0 0;text-align:center;">
            <h2 style="color:#edb84e;margin:0;">New Registration 🎉</h2>
            <p style="color:rgba(255,255,255,.6);margin:6px 0 0;">Sales Warrior Blueprint — ₹199</p>
          </div>
          <div style="background:#fff;padding:28px;border-radius:0 0 10px 10px;border:1px solid #eee;">
            <table style="width:100%;border-collapse:collapse;">
              <tr><td style="padding:9px 12px;border:1px solid #eee;font-weight:bold;background:#fafafa;">Name</td>       <td style="padding:9px 12px;border:1px solid #eee;">${name}</td></tr>
              <tr><td style="padding:9px 12px;border:1px solid #eee;font-weight:bold;background:#fafafa;">Phone</td>      <td style="padding:9px 12px;border:1px solid #eee;">${phone}</td></tr>
              <tr><td style="padding:9px 12px;border:1px solid #eee;font-weight:bold;background:#fafafa;">Email</td>      <td style="padding:9px 12px;border:1px solid #eee;">${email}</td></tr>
              <tr><td style="padding:9px 12px;border:1px solid #eee;font-weight:bold;background:#fafafa;">Profession</td> <td style="padding:9px 12px;border:1px solid #eee;">${profession}</td></tr>
              <tr><td style="padding:9px 12px;border:1px solid #eee;font-weight:bold;background:#fafafa;">Payment ID</td> <td style="padding:9px 12px;border:1px solid #eee;">${razorpay_payment_id}</td></tr>
              <tr><td style="padding:9px 12px;border:1px solid #eee;font-weight:bold;background:#fafafa;">Order ID</td>   <td style="padding:9px 12px;border:1px solid #eee;">${razorpay_order_id}</td></tr>
              <tr><td style="padding:9px 12px;border:1px solid #eee;font-weight:bold;background:#fafafa;">Time</td>       <td style="padding:9px 12px;border:1px solid #eee;">${timestamp}</td></tr>
            </table>
          </div>
        </div>
      `,
    });

    // ── 5. USER KO CONFIRMATION EMAIL ────────────────────
    await transporter.sendMail({
      from:    `"Coach Shruti Tiwari" <${process.env.EMAIL_USER}>`,
      to:      email,
      subject: "✅ Seat Confirmed! — Sales Warrior Blueprint",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:540px;margin:auto;">
          <div style="background:linear-gradient(135deg,#1e1030,#2d1554);padding:32px;text-align:center;border-radius:12px 12px 0 0;">
            <h1 style="color:#edb84e;font-size:1.5rem;margin:0;">Sales Warrior Blueprint</h1>
            <p style="color:rgba(255,255,255,.6);margin:8px 0 0;">with Coach Shruti Tiwari</p>
          </div>
          <div style="background:#fff;padding:32px;border-radius:0 0 12px 12px;border:1px solid #eee;">
            <h2 style="color:#1e1030;">Hi ${name}! 🎉</h2>
            <p style="color:#555;line-height:1.7;">
              Tumhari seat confirm ho gayi! Hum bahut excited hain tumhe <strong>Sales Warrior Blueprint</strong> live session mein milne ke liye.
            </p>
            <div style="background:#fdf0d4;border-left:4px solid #c8923a;padding:16px 20px;border-radius:4px;margin:20px 0;">
              <strong style="color:#c8923a;">Session Details</strong><br><br>
              📅 <strong>Date:</strong> This Sunday<br>
              🕙 <strong>Time:</strong> 7:00 – 8:30 PM IST<br>
              📍 <strong>Venue:</strong> Live on Zoom<br>
              🌐 <strong>Language:</strong> Hinglish
            </div>
            <p style="color:#555;line-height:1.7;">
              Zoom link session se pehle WhatsApp pe share kiya jayega.<br>
              Abhi join karo humari community:<br><br>
              <a href="https://chat.whatsapp.com/I7BDmR0YXP74FhNIMYVgun"
                 style="display:inline-block;background:#25D366;color:#fff;
                        padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">
                👉 Join WhatsApp Group
              </a>
            </p>
            <p style="color:#888;font-size:.85rem;margin-top:24px;">
              <strong>Payment ID:</strong> ${razorpay_payment_id}
            </p>
            <hr style="border:none;border-top:1px solid #eee;margin:20px 0;">
            <p style="color:#888;font-size:.85rem;">
              Sunday ko notebook aur energy ke saath aana! 🔥<br>
              — Coach Shruti Tiwari
            </p>
          </div>
        </div>
      `,
    });

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error("Verify error:", err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
}
