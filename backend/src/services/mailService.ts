import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: process.env.SMTP_USER ? {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  } : undefined,
});

export async function sendOtpEmail(to: string, code: string) {
  // Local development: the code is also printed so sign-up works without working SMTP.
  if (process.env.NODE_ENV !== 'production') console.info(`[dev] OTP for ${to}: ${code}`);
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@clickowl.com';
  await transporter.sendMail({
    from,
    to,
    subject: 'Your ClickOwl verification code',
    text: `Your verification code is ${code}. It expires in 10 minutes.`,
    html: `<p>Your verification code is <strong>${code}</strong>. It expires in 10 minutes.</p>`,
  });
}


export async function sendResetEmail(to: string, link: string) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@clickowl.com';
  await transporter.sendMail({
    from,
    to,
    subject: 'Reset your ClickOwl password',
    text: `Reset your password using this link: ${link}`,
    html: `<p>Reset your password using this link:</p><p><a href="${link}">${link}</a></p><p>This link expires in 1 hour.</p>`,
  });
}
