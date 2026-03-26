'use strict';

const hasLicenseKey = Boolean(process.env.NEW_RELIC_LICENSE_KEY);

exports.config = {
  app_name: [process.env.NEW_RELIC_APP_NAME || 'inhalex-backend'],
  license_key: process.env.NEW_RELIC_LICENSE_KEY,
  agent_enabled:
    hasLicenseKey && String(process.env.NEW_RELIC_ENABLED ?? 'true') !== 'false',
  logging: {
    level: process.env.NEW_RELIC_LOG_LEVEL || 'info',
  },
  distributed_tracing: {
    enabled: true,
  },
  application_logging: {
    forwarding: {
      enabled: true,
    },
    metrics: {
      enabled: true,
    },
    local_decorating: {
      enabled: false,
    },
  },
  security: {
    enabled: String(process.env.NEW_RELIC_SECURITY_ENABLED ?? 'false') === 'true',
    agent: {
      enabled:
        String(process.env.NEW_RELIC_SECURITY_AGENT_ENABLED ?? 'false') ===
        'true',
    },
    mode: process.env.NEW_RELIC_SECURITY_MODE || 'IAST',
  },
};
