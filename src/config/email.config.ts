import { registerAs } from '@nestjs/config';

export default registerAs('email', () => ({
  // Configuración SMTP
  transport: {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    secure: false, // true para 465, false para otros puertos
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD, // App password si usas Gmail
    },
  },

  // Configuración de emails
  defaults: {
    from: {
      name: 'somosHenry',
      address: process.env.EMAIL_FROM || 'noreply@novadevstudios.com',
    },
  },

  // Templates de emails
  templates: {
    welcome: {
      subject: '¡Bienvenido a somosHenry! 🎉',
      template: 'welcome',
    },
    resetPassword: {
      subject: 'Recupera tu contraseña',
      template: 'reset-password',
    },
    notification: {
      subject: 'Nueva notificación en somosHenry',
      template: 'notification',
    },
    classReminder: {
      subject: 'Recordatorio: Clase en 1 hora ⏰',
      template: 'class-reminder',
    },
  },

  // URLs del frontend
  urls: {
    frontend: process.env.FRONTEND_URL || 'http://localhost:3001',
    resetPassword: process.env.FRONTEND_URL + '/reset-password',
    verifyEmail: process.env.FRONTEND_URL + '/verify-email',
  },

  // Configuración de rate limiting
  rateLimit: {
    maxEmailsPerUser: 10, // máximo 10 emails por usuario
    timeWindow: 3600000, // en 1 hora (en ms)
  },
}));
