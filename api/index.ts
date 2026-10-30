/**
 * Vercel Serverless Function Entry Point
 *
 * This file bridges Vercel's serverless infrastructure and the Express app.
 */

// Explicitly mark environment as Vercel serverless runtime
process.env.VERCEL = '1';
if (!process.env.VERCEL_ENV) {
  process.env.VERCEL_ENV = 'production';
}

import fs from 'fs';
import path from 'path';

let appInstance: any = null;
let initError: any = null;

async function getApp() {
  if (appInstance) return appInstance;
  if (initError) throw initError;
  try {
    const mod = await import('../server.js');
    appInstance = mod.default || mod;
    return appInstance;
  } catch (err: any) {
    initError = err;
    throw err;
  }
}

export default async function handler(req: any, res: any) {
  // Diagnostic inspection endpoint for health check and root cause discovery
  if (req.url && req.url.includes('/api/health')) {
    try {
      const app = await getApp();
      // If server is loaded, let Express handle it or return health JSON
      return app(req, res);
    } catch (err: any) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(500).json({
        status: 'ERROR',
        error: 'SERVERLESS_FUNCTION_INITIALIZATION_ERROR',
        message: err?.message || String(err),
        code: err?.code || null,
        stack: err?.stack || null,
        cwd: process.cwd(),
        task_files: fs.existsSync('.') ? fs.readdirSync('.') : [],
        data_exists: fs.existsSync('data/db_store.json'),
        env_keys: Object.keys(process.env).sort()
      });
    }
  }

  try {
    const app = await getApp();
    return app(req, res);
  } catch (err: any) {
    console.error('[SERVERLESS_FUNCTION_INITIALIZATION_ERROR]', err);
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({
      error: 'SERVERLESS_FUNCTION_INITIALIZATION_ERROR',
      message: err?.message || String(err),
      code: err?.code || null,
      stack: err?.stack || null
    });
  }
}
