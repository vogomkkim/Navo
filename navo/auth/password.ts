import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'crypto';

function scryptAsync(
  password: string,
  salt: Buffer | string,
  keyLength: number,
  options: { N?: number; r?: number; p?: number; maxmem?: number } = {}
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCb(password, salt, keyLength, options, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(derivedKey as Buffer);
    });
  });
}

export interface ScryptParams {
  N: number;
  r: number;
  p: number;
  keyLength: number;
  maxmem?: number;
}

function getEnvNumber(name: string, fallback: number): number {
  const value = process.env[name];
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getScryptParams(): ScryptParams {
  // Allow tuning via env. Prefer LN (log2(N)) if provided, else SCRYPT_N.
  const ln = getEnvNumber('SCRYPT_LN', 15); // N = 2^15 = 32768 by default
  const explicitN = getEnvNumber('SCRYPT_N', 0);
  const N = explicitN > 0 ? explicitN : 1 << ln;
  const r = getEnvNumber('SCRYPT_R', 8);
  const p = getEnvNumber('SCRYPT_P', 1);
  const keyLength = getEnvNumber('SCRYPT_KEYLEN', 64);
  const maxmem = getEnvNumber('SCRYPT_MAXMEM', 256 * 1024 * 1024); // 256MB default
  return { N, r, p, keyLength, maxmem };
}

function toBase64(input: Buffer): string {
  return input.toString('base64');
}

function fromBase64(input: string): Buffer {
  return Buffer.from(input, 'base64');
}

function getLnFromN(N: number): number {
  // N should be a power of two; compute ln where N = 2^ln
  return Math.log2(N) | 0;
}

export function isScryptPhc(hash: string): boolean {
  return typeof hash === 'string' && hash.startsWith('$scrypt$');
}

export async function hashPassword(password: string): Promise<string> {
  const params = getScryptParams();
  const salt = randomBytes(16);
  const derivedKey = await scryptAsync(password, salt, params.keyLength, {
    N: params.N,
    r: params.r,
    p: params.p,
    maxmem: params.maxmem,
  });

  // PHC string format: $scrypt$ln=..,r=..,p=..$salt$hash
  const ln = getLnFromN(params.N);
  const phc = `$scrypt$ln=${ln},r=${params.r},p=${params.p}$${toBase64(salt)}$${toBase64(derivedKey)}`;
  return phc;
}

export interface VerifyResult {
  ok: boolean;
  needsRehash: boolean;
  newHash?: string;
}

export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<VerifyResult> {
  if (isScryptPhc(storedHash)) {
    const result = await verifyScryptPhc(password, storedHash);
    return { ok: result, needsRehash: false };
  }

  // Unknown format
  return { ok: false, needsRehash: false };
}

async function verifyScryptPhc(
  password: string,
  phc: string
): Promise<boolean> {
  // $scrypt$ln=..,r=..,p=..$salt$hash
  const parts = phc.split('$');
  // ['', 'scrypt', 'ln=..,r=..,p=..', 'saltB64', 'hashB64']
  if (parts.length !== 5) return false;

  const paramsPart = parts[2];
  const saltB64 = parts[3];
  const hashB64 = parts[4];

  const salt = fromBase64(saltB64);
  const storedKey = fromBase64(hashB64);

  const kv = Object.fromEntries(
    paramsPart.split(',').map((kv) => {
      const [k, v] = kv.split('=');
      return [k, v];
    })
  ) as Record<string, string>;

  const ln = Number(kv['ln']);
  const r = Number(kv['r']);
  const p = Number(kv['p']);
  if (!Number.isFinite(ln) || !Number.isFinite(r) || !Number.isFinite(p)) {
    return false;
  }
  const N = 1 << ln;

  const derivedKey = await scryptAsync(password, salt, storedKey.length, {
    N,
    r,
    p,
  });

  try {
    return timingSafeEqual(derivedKey, storedKey);
  } catch {
    return false;
  }
}
