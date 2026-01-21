import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

type MailPayload = {
  to: string;
  subject: string;
  text: string;
};

@Injectable()
export class EmailService {
  private transporter: Transporter | null = null;

  constructor(private readonly configService: ConfigService) {}

  private readString(key: string) {
    const value = this.configService.get<string | Uint8Array>(key);
    if (typeof value === 'string') {
      return value;
    }
    if (value instanceof Uint8Array) {
      return Buffer.from(value).toString();
    }
    return undefined;
  }

  private getTransporter() {
    if (this.transporter) {
      return this.transporter;
    }

    const host = this.readString('SMTP_HOST');
    const portValue = this.readString('SMTP_PORT');
    const user = this.readString('SMTP_USER');
    const pass = this.readString('SMTP_PASS');

    if (!host || !portValue) {
      return null;
    }

    const port = Number(portValue);
    const secure = port === 465;

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user && pass ? { user, pass } : undefined,
    });

    return this.transporter;
  }

  async sendMail(payload: MailPayload) {
    const transporter = this.getTransporter();
    const from = this.readString('EMAIL_FROM') || 'no-reply@example.com';

    if (!transporter) {
      console.log('[EmailService]', payload.subject, payload.text);
      return;
    }

    await transporter.sendMail({
      from,
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
    });
  }
}
