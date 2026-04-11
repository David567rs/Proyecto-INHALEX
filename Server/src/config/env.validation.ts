interface IntegerEnvOptions {
  min?: number;
  max?: number;
}

const NODE_ENVS = new Set(['development', 'test', 'production']);
const PRODUCTION_REQUIRED_KEYS = ['MONGODB_URI', 'JWT_SECRET', 'CORS_ORIGIN'];

function readOptionalString(
  config: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = config[key];

  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function validateIntegerEnv(
  config: Record<string, unknown>,
  errors: string[],
  key: string,
  options: IntegerEnvOptions = {},
) {
  const value = readOptionalString(config, key);

  if (!value) {
    return;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed)) {
    errors.push(`${key} debe ser un numero entero.`);
    return;
  }

  if (typeof options.min === 'number' && parsed < options.min) {
    errors.push(`${key} debe ser mayor o igual a ${options.min}.`);
  }

  if (typeof options.max === 'number' && parsed > options.max) {
    errors.push(`${key} debe ser menor o igual a ${options.max}.`);
  }
}

export function validateEnv(config: Record<string, unknown>) {
  const errors: string[] = [];
  const nodeEnv = readOptionalString(config, 'NODE_ENV') ?? 'development';

  if (!NODE_ENVS.has(nodeEnv)) {
    errors.push('NODE_ENV debe ser development, test o production.');
  }

  validateIntegerEnv(config, errors, 'PORT', { min: 1, max: 65535 });
  validateIntegerEnv(config, errors, 'AUTH_MAX_FAILED_ATTEMPTS', { min: 1 });
  validateIntegerEnv(config, errors, 'AUTH_FAILED_WINDOW_MINUTES', { min: 1 });
  validateIntegerEnv(config, errors, 'AUTH_LOCK_MINUTES', { min: 1 });
  validateIntegerEnv(config, errors, 'AUTH_RATE_STALE_MINUTES', { min: 1 });

  if (nodeEnv === 'production') {
    for (const key of PRODUCTION_REQUIRED_KEYS) {
      if (!readOptionalString(config, key)) {
        errors.push(`${key} es requerido en produccion.`);
      }
    }

    const jwtSecret = readOptionalString(config, 'JWT_SECRET');
    if (jwtSecret && jwtSecret.length < 32) {
      errors.push(
        'JWT_SECRET debe tener al menos 32 caracteres en produccion.',
      );
    }

    if (jwtSecret === 'change_this_in_production') {
      errors.push('JWT_SECRET no debe usar el valor de ejemplo en produccion.');
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `Variables de entorno invalidas:\n- ${errors.join('\n- ')}`,
    );
  }

  return {
    ...config,
    NODE_ENV: nodeEnv,
  };
}
