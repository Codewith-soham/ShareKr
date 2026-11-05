import nodemailer from 'nodemailer';
import { env } from '../../config/env.js';

// Delivery channel for OTP codes. Email today; an SMS sender can implement
// the same interface later without changing the auth flow.
export interface OtpSender {
  send(destination: string, code: string): Promise<void>;
}

// Dev only: prints the code to the server console. Never allowed in production.
export class ConsoleOtpSender implements OtpSender {
  async send(destination: string, code: string): Promise<void> {
    console.log(`[DEV OTP] ${destination}: ${code}`);
  }
}

export class EmailOtpSender implements OtpSender {
  private readonly transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  });

  async send(destination: string, code: string): Promise<void> {
    await this.transporter.sendMail({
      from: env.EMAIL_FROM,
      to: destination,
      subject: 'Your ShareKar verification code',
      text: `Your ShareKar verification code is ${code}. It expires in 5 minutes. If you did not request it, ignore this email.`,
    });
  }
}

export const createOtpSender = (): OtpSender =>
  env.OTP_DELIVERY === 'smtp' ? new EmailOtpSender() : new ConsoleOtpSender();
