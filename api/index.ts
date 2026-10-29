/**
 * Vercel Serverless Function Entry Point
 *
 * This file is the bridge between Vercel's serverless infrastructure
 * and the Express app defined in server.ts.
 *
 * Vercel automatically discovers and deploys all files in the `api/`
 * directory as serverless functions. By re-exporting the Express `app`
 * as the default export here, Vercel's Node.js runtime wraps it with
 * the standard `(req, res)` serverless handler signature.
 *
 * NOTE: The file-based JSON store (data/db_store.json) is seeded from
 * defaults on each cold start since Vercel's serverless environment is
 * stateless. This is intentional for demo/showcase deployments.
 * For production persistence, migrate to Vercel KV, Vercel Postgres,
 * or another external database.
 */

import app from '../server.js';

export default app;
