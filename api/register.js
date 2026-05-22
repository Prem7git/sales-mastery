const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, email, phone, profession } = req.body;
  if (!name || !email || !phone || !profession) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    // Google Sheets save
    await fetch('https://script.google.com/macros/s/AKfycbxqoi7gGnZUvn1WiEVbaMaNEw-qRs_eLxBfiyH_y2w-n5_HRKX6gXocdsRkU0Y6WnHa1w/exec', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, phone, profession })
    });

    // User confirmation email
    await transporter.sendMail({
      from: `"Coach Shruti Tiwari" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: 'Registration Confirmed — Sales Warrior Blueprint Free Webinar',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0c0a0e;color:#ffffff;padding:40px;border-radius:12px;">
          <h1 style="color:#f5a000;font-size:24px;margin-bottom:8px;">Registration Confirmed</h1>
          <p style="color:#cccccc;font-size:15px;line-height:1.7;">
            Dear ${name},<br><br>
            Your seat for the <strong style="color:#f5a000;">Sales Warrior Blueprint</strong> Free Live Webinar has been successfully confirmed.
          </p>
          <div style="background:#1a1520;border:1px solid #f5a000;border-radius:8px;padding:24px;margin:24px 0;">
            <p style="color:#f5a000;font-size:12px;letter-spacing:2px;text-transform:uppercase;margin:0 0 16px;">Webinar Details</p>
            <p style="margin:8px 0;color:#ffffff;font-size:14px;"><strong>Date:</strong> 31st May 2026</p>
            <p style="margin:8px 0;color:#ffffff;font-size:14px;"><strong>Time:</strong> 7:00 PM IST</p>
            <p style="margin:8px 0;color:#ffffff;font-size:14px;"><strong>Platform:</strong> Zoom (Live Online)</p>
            <p style="margin:8px 0;color:#ffffff;font-size:14px;"><strong>Language:</strong> Hindi and English</p>
            <p style="margin:8px 0;color:#ffffff;font-size:14px;"><strong>Zoom Link:</strong> <span style="color:#f5a000;">Will be shared on the WhatsApp Group prior to the session</span></p>
          </div>
          <div style="background:#1a1520;border:1px solid rgba(245,160,0,0.3);border-radius:8px;padding:20px;margin:16px 0;">
            <p style="color:#f5a000;font-size:12px;letter-spacing:2px;text-transform:uppercase;margin:0 0 12px;">Next Steps</p>
            <p style="margin:6px 0;color:#cccccc;font-size:14px;">1. Join the WhatsApp Group to receive your Zoom link and session reminders.</p>
            <p style="margin:6px 0;color:#cccccc;font-size:14px;">2. Save the date — 31st May 2026 at 7:00 PM IST.</p>
            <p style="margin:6px 0;color:#cccccc;font-size:14px;">3. Attend the session live. No recording will be made available.</p>
          </div>
          <a href="https://whatsapp.com/channel/0029VaCWY3h1t90U6tdNWx3x"
             style="display:block;text-align:center;background:#25D366;color:#ffffff;padding:14px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;margin:20px 0;">
            Join WhatsApp Group
          </a>
          <p style="color:#cccccc;font-size:14px;margin-top:24px;">
            For any queries, please reach out on Instagram:
            <a href="https://instagram.com/coachshrutitiwari" style="color:#f5a000;">@coachshrutitiwari</a>
          </p>
          <p style="color:#f5a000;font-size:16px;margin-top:28px;font-weight:bold;">We look forward to seeing you on 31st May.</p>
          <p style="color:#666666;font-size:12px;margin-top:8px;">— Coach Shruti Tiwari</p>
        </div>
      `
    });

    // Admin notification email
    await transporter.sendMail({
      from: `"SWB Bot" <${process.env.GMAIL_USER}>`,
      to: process.env.GMAIL_USER,
      subject: `New Registration — ${name}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;background:#0c0a0e;color:#ffffff;padding:32px;border-radius:12px;">
          <h2 style="color:#f5a000;">New Free Webinar Registration</h2>
          <div style="background:#1a1520;padding:20px;border-radius:8px;margin:16px 0;">
            <p style="margin:8px 0;font-size:14px;"><strong style="color:#f5a000;">Name:</strong> ${name}</p>
            <p style="margin:8px 0;font-size:14px;"><strong style="color:#f5a000;">Email:</strong> ${email}</p>
            <p style="margin:8px 0;font-size:14px;"><strong style="color:#f5a000;">Phone:</strong> ${phone}</p>
            <p style="margin:8px 0;font-size:14px;"><strong style="color:#f5a000;">Profession:</strong> ${profession}</p>
            <p style="margin:8px 0;font-size:14px;"><strong style="color:#f5a000;">Registered At:</strong> ${new Date().toLocaleString('en-IN', {timeZone:'Asia/Kolkata'})}</p>
          </div>
        </div>
      `
    });

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('Error in register:', err);
    return res.status(500).json({ error: err.message });
  }
};
