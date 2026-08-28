export class SourceUrlError extends Error {
  /** @param {'empty' | 'invalid' | 'unsupported_protocol' | 'credentials_not_allowed' | 'private_host'} code */
  constructor(code) {
    super(code);
    this.name = 'SourceUrlError';
    this.code = code;
  }
}

const privateIpv4Ranges = [
  /^0\./,
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^192\.168\./,
  /^22[4-9]\./,
  /^23\d\./,
  /^24\d\./,
  /^25[0-5]\./,
];

function isPrivateHost(hostname) {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, '');

  if (
    normalized === 'localhost'
    || normalized.endsWith('.localhost')
    || normalized.endsWith('.local')
    || normalized === '::1'
    || normalized.includes(':')
  ) {
    return true;
  }

  if (/^172\.(\d+)\./.test(normalized)) {
    const secondOctet = Number(normalized.split('.')[1]);
    if (secondOctet >= 16 && secondOctet <= 31) return true;
  }

  return privateIpv4Ranges.some((range) => range.test(normalized));
}

export function normalizeSourceUrl(value) {
  const trimmed = value.trim();
  if (!trimmed) throw new SourceUrlError('empty');

  const candidate = /^[a-z][a-z\d+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let parsed;

  try {
    parsed = new URL(candidate);
  } catch {
    throw new SourceUrlError('invalid');
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new SourceUrlError('unsupported_protocol');
  }
  if (parsed.username || parsed.password) {
    throw new SourceUrlError('credentials_not_allowed');
  }
  if (!parsed.hostname || isPrivateHost(parsed.hostname)) {
    throw new SourceUrlError('private_host');
  }

  return {
    hostname: parsed.hostname.replace(/^www\./i, ''),
    url: parsed.toString(),
  };
}
