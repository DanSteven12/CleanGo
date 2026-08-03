import dotenv from 'dotenv';

dotenv.config();

/**
 * Validates required environment variables and exports centralized configuration.
 */
function validateEnv(): void {
  const required: string[] = ['JWT_SECRET'];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`[Config Error] Faltan variables de entorno requeridas: ${missing.join(', ')}`);
  }
}

validateEnv();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5001', 10),

  jwt: {
    secret: process.env.JWT_SECRET!,
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  },

  cookie: {
    name: process.env.COOKIE_NAME || 'cleango_session',
    refreshName: process.env.REFRESH_COOKIE_NAME || 'cleango_refresh',
    csrfName: process.env.CSRF_COOKIE_NAME || 'XSRF-TOKEN',
    secure: process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production',
    sameSite: (process.env.COOKIE_SAME_SITE as 'lax' | 'strict' | 'none') || 'lax',
    domain: process.env.COOKIE_DOMAIN || undefined,
    accessMaxAgeMinutes: parseInt(process.env.ACCESS_COOKIE_MAX_AGE_MINUTES || '15', 10),
    rememberMaxAgeDays: parseInt(process.env.COOKIE_REMEMBER_MAX_AGE_DAYS || '7', 10),
    
    get accessMaxAgeMs(): number {
      return this.accessMaxAgeMinutes * 60 * 1000;
    },

    get rememberMaxAgeMs(): number {
      return this.rememberMaxAgeDays * 24 * 60 * 60 * 1000;
    },
  },
};
