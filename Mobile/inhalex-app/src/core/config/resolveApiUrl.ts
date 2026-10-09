export interface ApiUrlContext {
  isDevelopment: boolean;
  platform: string;
  isExpoClient: boolean;
  hostUri?: string | null;
}

export interface ApiUrlResolution {
  apiUrl: string;
  apiConnectionHint: string | null;
}

function isLoopback(hostname: string): boolean {
  return ['localhost', '127.0.0.1', '[::1]', '::1'].includes(hostname.toLowerCase());
}

function isPrivateAddress(hostname: string): boolean {
  const ipv4 = hostname.split('.');
  if (ipv4.length === 4 && ipv4.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255)) {
    const [first, second] = ipv4.map(Number);
    return first === 10 || (first === 172 && second >= 16 && second <= 31)
      || (first === 192 && second === 168);
  }

  // Unique local IPv6 addresses are routable on the LAN without a zone identifier.
  return /^\[f[cd][0-9a-f]{2}:/i.test(hostname);
}

function getLocalMetroHostname(hostUri: string | null | undefined): string | null {
  if (!hostUri?.trim()) return null;

  try {
    const value = hostUri.trim();
    const metro = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(value) ? value : `http://${value}`);
    if (!['http:', 'https:', 'exp:', 'exps:'].includes(metro.protocol)
      || metro.username || metro.password || metro.search || metro.hash
      || (metro.pathname && metro.pathname !== '/')
      || (metro.port && Number(metro.port) > 65535)
      || !isPrivateAddress(metro.hostname)) {
      return null;
    }
    return metro.hostname;
  } catch {
    return null;
  }
}

export function resolveApiUrl(value: string, context: ApiUrlContext): ApiUrlResolution {
  const normalized = value.trim().replace(/\/+$/, '');
  let api: URL;
  try {
    api = new URL(normalized);
    if (!['http:', 'https:'].includes(api.protocol) || !api.hostname) throw new Error();
  } catch {
    throw new Error('EXPO_PUBLIC_API_URL debe ser una URL http o https valida.');
  }

  if (!context.isDevelopment && api.protocol !== 'https:') {
    throw new Error('Las versiones de distribucion de INHALEX requieren una API con HTTPS.');
  }

  const usesLocalExpoApi = context.isDevelopment && context.platform === 'android'
    && context.isExpoClient && isLoopback(api.hostname);
  if (!usesLocalExpoApi) return { apiUrl: normalized, apiConnectionHint: null };

  const metroHostname = getLocalMetroHostname(context.hostUri);
  if (!metroHostname) {
    return {
      apiUrl: normalized,
      apiConnectionHint: 'Para conectar con la API local, abre Expo en modo LAN y conecta el teléfono y tu equipo a la misma red. Si usas un túnel, configura la dirección de tu API en EXPO_PUBLIC_API_URL.',
    };
  }

  // Only the host changes: the API keeps its own port and path, independent of Metro.
  api.hostname = metroHostname;
  return { apiUrl: api.toString().replace(/\/+$/, ''), apiConnectionHint: null };
}
