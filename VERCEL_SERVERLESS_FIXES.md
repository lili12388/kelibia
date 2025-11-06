# Vercel Serverless Architecture - Solutions Guide

## Problem Summary
When deploying an Express backend to Vercel serverless functions, several issues occurred with module resolution, JWT imports, and routing conflicts.

---

## ✅ Solution Pattern: Hybrid Architecture

### Architecture Overview
```
api/
  [...path].ts          → Catch-all Express app (handles most routes)
  properties/
    submit.ts           → Dedicated serverless function (handles JSON with base64)
  broker/
    auth-status.ts      → Dedicated serverless function (handles auth checks)
```

**Key Principle:** Use **dedicated API files** for endpoints that need different handling than the Express app, and explicitly route to them BEFORE the catch-all.

---

## Fix #1: ESM Module Resolution

### Problem
```
Error: Cannot find module '/var/task/server/db'
```

### Root Cause
- Vercel's Node.js ESM runtime requires explicit `.js` extensions on relative imports
- TypeScript allows omitting extensions in dev, but production breaks

### Solution
```typescript
// ❌ WRONG (works in dev, fails in production)
import { db } from '../../server/db';
import * as schema from '../shared/schema';

// ✅ CORRECT (works everywhere)
import { db } from '../../server/db.js';
import * as schema from '../shared/schema.js';
```

**Action Taken:**
- Added `.js` extensions to ALL relative imports in `api/**/*.ts` and `server/**/*.ts`

---

## Fix #2: Bundle Server Code with Serverless Function

### Problem
```
Error: Cannot find module '/var/task/server/routes'
```

### Root Cause
- Vercel's `@vercel/node` only bundles files inside `api/` directory
- `server/` and `shared/` folders were not included in the function bundle

### Solution
Add `includeFiles` config in `vercel.json`:

```json
{
  "builds": [
    {
      "src": "api/[...path].ts",
      "use": "@vercel/node",
      "config": {
        "maxDuration": 60,
        "includeFiles": [
          "server/**",
          "shared/**"
        ]
      }
    }
  ]
}
```

**Why This Works:**
- Tells Vercel to copy `server/` and `shared/` folders into the serverless function bundle
- No need to move folders into `api/` directory

---

## Fix #3: JWT Import in ESM Dynamic Imports

### Problem
```
TypeError: sign is not a function
TypeError: verify is not a function
```

### Root Cause
When using dynamic imports with `jsonwebtoken` in ESM, named destructuring doesn't work correctly.

### Solution
```typescript
// ❌ WRONG
const { sign } = await import('jsonwebtoken');
const token = sign({ isBroker: true }, secret, { expiresIn: '24h' });

// ✅ CORRECT
const jwt = await import('jsonwebtoken');
const token = jwt.default.sign({ isBroker: true }, secret, { expiresIn: '24h' });
```

**Files Fixed:**
- `server/routes.ts` - Login endpoint (line ~75)
- `server/routes.ts` - Auth status endpoint (line ~137)

---

## Fix #4: Routing Conflicts Between Catch-All and Individual APIs

### Problem
- Frontend sends **JSON with base64 images** to `/api/properties/submit`
- Catch-all routes to Express handler expecting **FormData/multipart**
- Results in mismatch and validation errors

### Solution Architecture

#### vercel.json Configuration
```json
{
  "builds": [
    {
      "src": "api/properties/submit.ts",
      "use": "@vercel/node",
      "config": { "maxDuration": 60 }
    },
    {
      "src": "api/broker/auth-status.ts",
      "use": "@vercel/node"
    },
    {
      "src": "api/[...path].ts",
      "use": "@vercel/node",
      "config": {
        "maxDuration": 60,
        "includeFiles": ["server/**", "shared/**"]
      }
    }
  ],
  "routes": [
    {
      "src": "/api/properties/submit",
      "dest": "/api/properties/submit.ts"
    },
    {
      "src": "/api/broker/auth-status",
      "dest": "/api/broker/auth-status.ts"
    },
    {
      "src": "/api/(.*)",
      "dest": "/api/[...path].ts"
    }
  ]
}
```

**Key Points:**
1. **Explicit routes BEFORE catch-all** - Order matters!
2. **Build each individual API file** as separate serverless function
3. **Catch-all gets lowest priority** - Handles all other `/api/*` routes

### When to Use Individual API Files vs Catch-All

| Use Individual API File When: | Use Catch-All Express When: |
|-------------------------------|----------------------------|
| Needs different request format (JSON vs FormData) | Standard REST endpoints |
| Requires special Vercel config | Database queries |
| Handles large payloads (base64 images) | CRUD operations |
| Needs specific middleware | Batch operations |

---

## Fix #5: Cookie-Based Authentication in Serverless

### Problem
- Express sessions don't persist across serverless cold starts
- Need stateless authentication

### Solution
Use **JWT tokens in HTTP-only cookies**:

```typescript
// Login endpoint
const token = jwt.default.sign(
  { isBroker: true, isAuthenticated: true },
  process.env.JWT_SECRET,
  { expiresIn: '24h' }
);

res.cookie('broker_token', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 24 * 60 * 60 * 1000
});
```

```typescript
// Auth check endpoint
const token = req.cookies?.broker_token;
const decoded = jwt.default.verify(token, secret) as { isBroker: boolean };
```

---

## Common Patterns & Best Practices

### 1. Environment Variables
Always provide fallbacks for local dev:
```typescript
const BROKER_PASSWORD = process.env.BROKER_PASSWORD || 'broker123';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
```

### 2. Error Logging
Add detailed console logs for debugging in Vercel logs:
```typescript
try {
  // operation
} catch (error) {
  console.error('[ENDPOINT-NAME] Error:', error);
  console.error('[ENDPOINT-NAME] Stack:', error instanceof Error ? error.stack : 'No stack');
  res.status(500).json({ 
    error: 'Failed', 
    details: error instanceof Error ? error.message : String(error) 
  });
}
```

### 3. CORS Headers
Always set CORS for API endpoints:
```typescript
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

if (req.method === 'OPTIONS') {
  return res.status(200).end();
}
```

---

## Troubleshooting Checklist

When encountering errors on Vercel:

- [ ] All relative imports use `.js` extensions
- [ ] `server/` and `shared/` included in `includeFiles`
- [ ] JWT imports use `jwt.default.sign()` / `jwt.default.verify()`
- [ ] Individual API files built as separate serverless functions
- [ ] Routing order correct (specific routes before catch-all)
- [ ] Environment variables set in Vercel dashboard
- [ ] Check Vercel function logs for detailed error messages

---

## Files Modified in This Fix

### Core Configuration
- `vercel.json` - Added builds and routes for hybrid architecture

### Server Code
- `server/routes.ts` - Fixed JWT imports (login + auth-status)
- `server/db.ts` - Added `.js` extensions
- `server/storage.ts` - Added `.js` extensions
- `server/middleware/auth.ts` - Added `.js` extensions
- `server/middleware/analytics.ts` - Added `.js` extensions

### API Endpoints
- `api/[...path].ts` - Catch-all Express wrapper with includeFiles
- `api/properties/submit.ts` - Individual endpoint for JSON submissions
- `api/broker/auth-status.ts` - Individual endpoint for auth checks
- `api/broker/login.ts` - Removed (duplicate, handled by catch-all)
- All other `api/**/*.ts` - Added `.js` extensions

---

## Summary

**The winning formula for Vercel serverless with Express:**

1. ✅ Use `.js` extensions on all ESM imports
2. ✅ Bundle server code with `includeFiles` config
3. ✅ Use `jwt.default.sign()` / `jwt.default.verify()` for dynamic imports
4. ✅ Create individual API files for special cases (base64 uploads, etc.)
5. ✅ Route specific endpoints BEFORE catch-all in `vercel.json`
6. ✅ Use JWT cookies instead of sessions for stateless auth

This hybrid approach gives you the best of both worlds:
- Express app for standard API routes
- Individual functions for specialized endpoints
- Proper module bundling and resolution
