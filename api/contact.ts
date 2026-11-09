/**
 * POST /api/contact (Vercel Serverless Function, Node.js runtime, Web Request/Response API).
 * All logic lives in ./_lib (underscore folders are not deployed as routes).
 */
import { createContactHandler } from './_lib/handler.js';

const handle = createContactHandler({ env: process.env });

// Every method goes through the handler so unsupported ones get a proper 405 + Allow header.
export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
export const OPTIONS = handle;
