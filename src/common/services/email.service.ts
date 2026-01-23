import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type { Order } from '../../database/entities/Order';
import type { OrderItem } from '../../database/entities/OrderItem';
import type { User } from '../../database/entities/user.entity';

type MailPayload = {
  to: string;
  subject: string;
  text?: string;
  html?: string;
};

type OrderConfirmationPayload = {
  user: User;
  order: Order;
  items: OrderItem[];
};

@Injectable()
export class EmailService {
  private transporter: Transporter | null = null;

  constructor(private readonly configService?: ConfigService) {}

  private readString(key: string) {
    if (this.configService) {
      const value = this.configService.get<string | Uint8Array>(key);
      if (typeof value === 'string') {
        return value;
      }
      if (value instanceof Uint8Array) {
        return Buffer.from(value).toString();
      }
    }
    return process.env[key];
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
    const from = this.readString('EMAIL_FROM') || 'no-reply@novadev.com';

    if (!transporter) {
      console.log('[EmailService]', {
        to: payload.to,
        subject: payload.subject,
        text: payload.text,
        html: payload.html,
      });
      return;
    }

    await transporter.sendMail({
      from,
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
    });
  }

  async sendOrderConfirmationEmail(payload: OrderConfirmationPayload) {
    const { user, order, items } = payload;
    const frontendUrl =
      this.readString('FRONTEND_URL') || 'http://localhost:3000';
    const orderLink = `${frontendUrl}/orders/${order.id}`;
    const name =
      user.profile?.firstName || user.profile?.lastName || user.email;

    const itemsHtml = items
      .map(
        (item) =>
          `<li>${item.productName} x${item.quantity} - ${order.currency} ${item.unitPrice}</li>`,
      )
      .join('');

    const html = `
      <p>Hola ${name},</p>
      <p>Gracias por tu compra. Tu orden <strong>#${order.id}</strong> fue confirmada.</p>
      <ul>${itemsHtml}</ul>
      <p>Total: <strong>${order.currency} ${order.total}</strong></p>
      <p>Podés ver el detalle aquí: <a href="${orderLink}">${orderLink}</a></p>
    `;

    const textLines = items.map(
      (item) =>
        `${item.productName} x${item.quantity} - ${order.currency} ${item.unitPrice}`,
    );

    const text = [
      `Hola ${name},`,
      `Gracias por tu compra. Tu orden #${order.id} fue confirmada.`,
      ...textLines,
      `Total: ${order.currency} ${order.total}`,
      `Detalle: ${orderLink}`,
    ].join('\n');

    await this.sendMail({
      to: user.email,
      subject: 'Confirmacion de compra',
      text,
      html,
    });
  }
}
