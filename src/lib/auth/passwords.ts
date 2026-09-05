import crypto from 'crypto';

/**
 * Hash password using Node's native crypto.scrypt
 * Secure, salted, and resistant to rainbow table & GPU brute-force attacks.
 */
export async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`${salt}:${derivedKey.toString('hex')}`);
    });
  });
}

/**
 * Verify password against stored salt:hash string using constant-time comparison
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const [salt, key] = storedHash.split(':');
    if (!salt || !key) return resolve(false);

    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      const keyBuffer = Buffer.from(key, 'hex');
      const match = crypto.timingSafeEqual(keyBuffer, derivedKey);
      resolve(match);
    });
  });
}
