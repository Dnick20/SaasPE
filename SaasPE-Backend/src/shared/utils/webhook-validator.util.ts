import * as crypto from 'crypto';

/**
 * Webhook signature validation utilities
 */

/**
 * Validate DocuSign Connect webhook signature
 * DocuSign uses HMAC-SHA256 with the Connect Key
 */
export function validateDocuSignWebhook(
  payload: string,
  signature: string,
  connectKey: string,
): boolean {
  try {
    const hmac = crypto.createHmac('sha256', connectKey);
    hmac.update(payload);
    const expectedSignature = hmac.digest('base64');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    );
  } catch (error) {
    return false;
  }
}

/**
 * Validate Adobe Sign webhook signature
 * Adobe Sign uses HMAC-SHA256 with the client secret
 */
export function validateAdobeSignWebhook(
  payload: string,
  signature: string,
  clientSecret: string,
): boolean {
  try {
    const hmac = crypto.createHmac('sha256', clientSecret);
    hmac.update(payload);
    const expectedSignature = hmac.digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature.toLowerCase()),
      Buffer.from(expectedSignature.toLowerCase()),
    );
  } catch (error) {
    return false;
  }
}

/**
 * Validate SignNow webhook signature
 * SignNow uses HMAC-SHA1 with the API token
 */
export function validateSignNowWebhook(
  payload: string,
  signature: string,
  apiToken: string,
): boolean {
  try {
    const hmac = crypto.createHmac('sha1', apiToken);
    hmac.update(payload);
    const expectedSignature = hmac.digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature.toLowerCase()),
      Buffer.from(expectedSignature.toLowerCase()),
    );
  } catch (error) {
    return false;
  }
}

/**
 * Validate Google webhook signature
 * Google uses X-Goog-Channel-Token header for verification
 */
export function validateGoogleWebhook(
  channelToken: string,
  expectedToken: string,
): boolean {
  try {
    return crypto.timingSafeEqual(
      Buffer.from(channelToken),
      Buffer.from(expectedToken),
    );
  } catch (error) {
    return false;
  }
}

/**
 * Extract signature from headers based on provider
 */
export function extractWebhookSignature(
  headers: Record<string, string | string[] | undefined>,
  provider: string,
): string | null {
  const lowerHeaders: Record<string, string> = {};
  Object.keys(headers).forEach((key) => {
    const value = headers[key];
    lowerHeaders[key.toLowerCase()] = Array.isArray(value)
      ? value[0]
      : value || '';
  });

  switch (provider) {
    case 'docusign':
      return lowerHeaders['x-docusign-signature-1'] || null;

    case 'adobe_sign':
      return lowerHeaders['x-adobesign-signature'] || null;

    case 'signnow':
      return lowerHeaders['x-signnow-signature'] || null;

    case 'google_workspace':
      return lowerHeaders['x-goog-channel-token'] || null;

    default:
      return null;
  }
}
