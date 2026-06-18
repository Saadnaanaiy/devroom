# Security Measures — DevRoom

This document outlines the security measures implemented in the DevRoom application.

---

## Authentication & Authorization

| Measure | Details |
|---------|---------|
| **JWT-based auth** | Tokens signed with HS256, expire after 24 hours |
| **`token_required` decorator** | Validates JWT on every protected route, rejects expired/invalid tokens |
| **Role-based access** | Admin-only routes (blog CRUD, channel management, admin panel) enforced server-side |
| **Route guards** | Frontend `ProtectedRoute` + `AdminRoute` prevent unauthorized navigation |
| **Auto-logout on 401** | Axios interceptor detects expired tokens and clears session |
| **Socket.IO auth** | WebSocket connections require valid JWT; rejected on connect if invalid |
| **Self-deletion prevention** | Admins cannot delete their own account |

## Password Security

| Measure | Details |
|---------|---------|
| **Hashing** | PBKDF2 via `werkzeug.security.generate_password_hash` |
| **Server-side policy** | Min 8 chars, must include uppercase, lowercase, number, and special character |
| **Client-side matching** | Registration and password reset pages enforce same rules client-side |
| **Rate-limited reset** | Password reset endpoint: 3 requests per 5 minutes |

## Rate Limiting

| Endpoint | Limit |
|----------|-------|
| Register | 20 req / 5 min |
| Login | 10 req / 60 sec |
| Send verification | 2 req / 5 min |
| Forgot password | 2 req / 5 min |
| Reset password | 3 req / 5 min |
| Verify email | 5 req / 60 sec |
| Blog rating | 10 req / 60 sec |
| Comments | 5 req / 30 sec |
| Chat image upload | 10 req / 60 sec |
| Socket messages | 1 msg / 300ms per room per user |

Rate limiter uses a sliding-window algorithm keyed by IP + endpoint.

## Input Validation & Sanitization

| Measure | Details |
|---------|---------|
| **HTML sanitization** | All user-generated text is HTML-escaped via `html.escape()` in model `to_dict()` methods |
| **XSS stripping** | `strip_xss()` removes all HTML tags via regex |
| **Email validation** | Regex pattern check on registration and profile |
| **Length validation** | Enforced on all string fields (username, names, blog fields, comments, dev room fields, etc.) |
| **Blog content limit** | Max 100,000 characters |
| **Comment limit** | Max 5,000 characters |
| **Dev room limits** | Name: 120, Description: 2,000, GitHub URL: 500 characters |
| **No `dangerouslySetInnerHTML`** | React's JSX auto-escapes all expressions |

## SQL Injection Prevention

| Measure | Details |
|---------|---------|
| **SQLAlchemy ORM** | Parameterized queries by default throughout the application |
| **Raw SQL** | Uses bind parameters (`:start`) in the few places raw SQL is needed (admin trends) |

## File Upload Security

| Measure | Details |
|---------|---------|
| **Magic byte detection** | Reads file header (first 32 bytes) and verifies against known signatures for PNG, JPG, GIF, WebP |
| **Extension whitelist** | Only `png`, `jpg`, `jpeg`, `gif` allowed |
| **Max file size** | 16 MB limit |
| **Secure filenames** | `werkzeug.utils.secure_filename()` + timestamp prefix prevents overwrites |
| **Old file cleanup** | Previous avatar/cover images are deleted when replaced |

## HTTP Security Headers

All API responses include:

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 0
Strict-Transport-Security: max-age=31536000; includeSubDomains
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' ws: wss:; media-src 'self' blob:; frame-src 'none'; object-src 'none'
Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0
Pragma: no-cache
Expires: 0
```

## CORS Configuration

- Restricted to specific origins from `FRONTEND_URL` environment variable
- Supports credentials
- Path-restricted to `/api/*` routes

## Secrets Management

| Secret | Status |
|--------|--------|
| `SECRET_KEY` | Auto-generated random 64-char hex if not set in `.env` |
| `JWT_SECRET_KEY` | Auto-generated random 64-char hex if not set in `.env` |
| `ADMIN_SECRET_KEY` | Set in `.env` — must be a strong, unpredictable value |
| `RESEND_API_KEY` | Set in `.env` — used for transactional emails |
| `.env` in `.gitignore` | Secrets are never committed to the repository |

## WebSocket Security

- JWT token required on connection
- Room-level access controls for direct messages
- Message rate limiting per room per user
- Content length validation on socket messages

## Activity Logging

All significant user actions are logged to the `activity_log` table:
- Registration, login
- Blog creation, commenting
- Channel creation, renaming, deletion
- Dev room creation, update, deletion
- Admin user updates

## Additional Protections

- **Generic error messages** on forgot-password (prevents email enumeration)
- **`noopener noreferrer`** on all external links
- **Admin-only channel protection** — protected channels cannot be deleted
- **Debug mode** controlled by `FLASK_DEBUG` environment variable (disabled in production)
- **HTTPS** — HSTS header set; HTTPS termination should be handled by reverse proxy

---

*Last updated: June 2026*
