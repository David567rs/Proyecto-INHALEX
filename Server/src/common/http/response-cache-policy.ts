import type { RequestHandler } from 'express';

/**
 * Fail closed: new API routes are private unless a public controller explicitly
 * supplies a cache policy. Runs before controllers, including guard failures.
 * A future service worker still needs an explicit public GET allowlist.
 */
export const privateResponseCachePolicy: RequestHandler = (
  _request,
  response,
  next,
) => {
  response.setHeader('Cache-Control', 'private, no-store, max-age=0');
  next();
};
