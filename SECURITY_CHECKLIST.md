# Security Checklist for Errandify

## 🔐 Environment & Secrets Management

### ✅ Already Implemented
- [x] `.env` file in `.gitignore` - secrets never committed
- [x] `.env.example` documented - shows structure without real values
- [x] Separate `.env` files per environment (dev, staging, prod)
- [x] All API keys stored in environment variables only

### ⚠️ To Implement
- [ ] Use secrets management system in production (AWS Secrets Manager, HashiCorp Vault)
- [ ] Rotate API keys every 90 days
- [ ] Never log sensitive keys/tokens
- [ ] Audit all key access

---

## 🛡️ API Security

### Authentication
- [x] JWT tokens for API authentication
- [ ] Implement token refresh mechanism
- [ ] Set short token expiration times (15 min access, 7 day refresh)
- [ ] Invalidate tokens on logout
- [ ] Prevent token reuse

### Rate Limiting
- [ ] Implement rate limiting on all public endpoints
- [ ] 100 requests/min per user for general APIs
- [ ] 5 requests/min for authentication endpoints
- [ ] 10 requests/min for payment endpoints

### CORS & Headers
- [x] Backend configured with proper CORS
- [ ] Set `Strict-Transport-Security: max-age=31536000`
- [ ] Set `Content-Security-Policy` headers
- [ ] Disable `X-Content-Type-Options: nosniff`
- [ ] Set `X-Frame-Options: DENY`

---

## 💳 Payment Security (Stripe)

### PCI Compliance
- [ ] Never store raw card data - use Stripe Elements
- [ ] Use Stripe Connect for payouts (not direct transfers)
- [ ] Enable 3D Secure for higher risk transactions
- [ ] Implement webhook signature verification

### Testing
- [ ] Test mode keys only until production ready
- [ ] Test with Stripe test card: `4242 4242 4242 4242`
- [ ] Implement proper error handling for failed payments
- [ ] Log all payment events (but NOT card data)

### Webhook Security
- [ ] Verify webhook signatures
- [ ] Only accept from Stripe IP addresses
- [ ] Implement webhook retry logic
- [ ] Store webhook events for audit trail

---

## 🔑 Authentication Security (SingPass)

### OAuth2 Implementation
- [ ] Validate all OAuth2 authorization codes
- [ ] Implement PKCE (Proof Key for Code Exchange)
- [ ] Use secure random state parameter
- [ ] Short-lived authorization codes (10 min)
- [ ] Long-lived refresh tokens (30 days)

### Token Handling
- [ ] Sign tokens with private key (ED25519)
- [ ] Store private key in backend `.env` only
- [ ] Never expose private key in frontend
- [ ] Validate token signatures on every request
- [ ] Check token expiration

### Data Security
- [ ] Encrypt MyInfo data at rest
- [ ] Encrypt MyInfo data in transit (HTTPS only)
- [ ] Implement field-level encryption for PII
- [ ] Data access logs for compliance
- [ ] PDPA consent tracking

---

## 🗄️ Database Security

### Access Control
- [ ] Use strong database passwords
- [ ] Restrict database access to backend only
- [ ] Use SSL/TLS for database connections
- [ ] Regular database backups (daily minimum)
- [ ] Test backup restoration procedures

### Data Protection
- [ ] Encrypt sensitive fields: passwords, SSN, etc.
- [ ] Hash passwords with bcrypt/argon2
- [ ] Implement row-level security for user data
- [ ] Audit logs for data access
- [ ] Implement data retention policies

### SQL Injection Prevention
- [x] Use parameterized queries (already implemented)
- [x] Input validation on all endpoints
- [ ] Regular SQL injection testing

---

## 📝 Logging & Monitoring

### What to Log
- [x] All authentication attempts
- [x] All payment transactions
- [ ] All data access (especially PII)
- [ ] API errors and exceptions
- [ ] Failed security checks

### What NOT to Log
- ❌ API keys or tokens
- ❌ Credit card data
- ❌ Passwords or session IDs
- ❌ Personal identification details (SSN, NRIC)

### Monitoring
- [ ] Set up error monitoring (Sentry, etc.)
- [ ] Set up performance monitoring
- [ ] Set up security monitoring
- [ ] Set up alerts for suspicious activity
- [ ] Regular log review (weekly minimum)

---

## 🔄 Deployment Security

### Before Going Live
- [ ] Change all test keys to production keys
- [ ] Review all environment variables
- [ ] Enable HTTPS everywhere
- [ ] Set secure cookie flags (HttpOnly, Secure, SameSite)
- [ ] Implement security headers
- [ ] Run security audit
- [ ] Penetration testing (optional but recommended)

### Infrastructure
- [ ] Database server not exposed to internet
- [ ] Backend server behind firewall
- [ ] Use VPN for admin access
- [ ] Enable WAF (Web Application Firewall)
- [ ] Regular security updates and patches

---

## 🚨 Incident Response

### Prepare For
- [ ] API key compromise → rotate immediately
- [ ] Database breach → notify users
- [ ] Payment system down → fallback mechanism
- [ ] DDoS attack → rate limiting, WAF
- [ ] Unauthorized access → revoke sessions

### Response Plan
- [ ] Documented incident response procedures
- [ ] Contact information for security team
- [ ] Communication plan for users
- [ ] Root cause analysis process
- [ ] Prevention improvements

---

## ✅ Security Checklist by Priority

### Critical (Fix Immediately)
- [ ] Verify .env is in .gitignore and never committed
- [ ] Implement HTTPS only (no HTTP)
- [ ] Enable Stripe webhook signature verification
- [ ] Implement OAuth2 state parameter validation
- [ ] Hash all passwords before storage

### High (Fix This Sprint)
- [ ] Implement rate limiting
- [ ] Set security headers
- [ ] Implement proper error handling (no stack traces in production)
- [ ] Add audit logging
- [ ] Implement token expiration

### Medium (Fix Next Sprint)
- [ ] Add monitoring and alerting
- [ ] Implement secrets rotation
- [ ] Add WAF rules
- [ ] Implement PKCE for OAuth2
- [ ] Add security headers

### Low (Ongoing)
- [ ] Regular penetration testing
- [ ] Security training for team
- [ ] Code security reviews
- [ ] Dependency vulnerability scanning
- [ ] Regular security audits

---

## 📊 Security Status

| Category | Status | Priority | Owner |
|----------|--------|----------|-------|
| Secrets Management | ✅ Partial | High | DevOps |
| API Security | 🟡 In Progress | High | Backend |
| Payment Security | 🟡 In Progress | Critical | Backend |
| Auth Security | 🟡 In Progress | Critical | Backend |
| Database Security | 🟡 In Progress | High | DevOps |
| Logging & Monitoring | 🟡 In Progress | High | DevOps |
| Deployment Security | ⏳ Pending | Medium | DevOps |

**Overall Status:** 🟡 Development in Progress

---

## 📞 Security Contacts

- **Stripe Support:** https://support.stripe.com
- **SingPass Support:** https://www.singpass.gov.sg/support
- **PDPA Enquiries:** https://www.pdpc.gov.sg/

