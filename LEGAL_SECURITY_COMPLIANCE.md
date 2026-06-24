# ⚖️ Legal & Security Compliance Guide

## CRITICAL: Before Launch

You MUST complete these items before going live. Failure to do so could result in:
- 🚨 Legal liability
- 💰 Significant fines
- 🔒 Hacked accounts & stolen data
- 📵 Service shutdown

---

## 📋 Legal Requirements

### 1. Terms & Conditions
**Status:** ❌ NOT CREATED

**What it is:** Legal agreement between you and users
- Use of service
- Payment terms
- Dispute resolution
- Limitation of liability

**You need to:**
- [ ] Hire a lawyer (or use online legal services)
- [ ] Draft T&Cs specific to Singapore
- [ ] Include payment disclaimers
- [ ] Clearly state fees and charges
- [ ] Add cancellation/refund policy
- [ ] Have users accept before signup

**Cost:** $500-2,000 (lawyer) or $100-300 (online service)

### 2. Privacy Policy (Personal Data Protection Act - PDPA)
**Status:** ❌ NOT CREATED

**What it is:** How you collect, use, and protect user data

**Singapore PDPA Requirements:**
- [ ] Explain data collection
- [ ] Get user consent for data use
- [ ] Provide data access/correction rights
- [ ] Security measures for data protection
- [ ] Retention and deletion policies
- [ ] Third-party sharing disclosure (Stripe, SingPass)

**You need to:**
- [ ] Draft PDPA-compliant privacy policy
- [ ] Explain Stripe receives payment data
- [ ] Explain SingPass receives identity data
- [ ] Show data retention periods
- [ ] Explain user rights (access, correct, delete)
- [ ] Have users accept before signup

**Cost:** $300-1,500 (lawyer) or free (online templates with legal review)

### 3. Service Agreement
**Status:** ❌ NOT CREATED

**What it is:** Rules for using the service
- User conduct
- Prohibited activities
- Dispute resolution process
- Account termination conditions

**You need to:**
- [ ] Define prohibited content
- [ ] Set dispute procedures
- [ ] Explain account suspension/deletion
- [ ] Include arbitration clause (optional)
- [ ] Have users accept before signup

**Cost:** $300-1,000 (lawyer)

---

## 🔒 Security Requirements

### 1. Data Encryption
**Status:** ✅ PARTIALLY DONE

**What's protected:**
- ✅ JWT tokens for auth
- ✅ Password hashing (bcrypt/argon2)
- ❌ Payment data (Stripe handles - good!)
- ❌ Personal data encryption at rest
- ❌ Database encryption

**You need to:**
- [ ] Enable database encryption (AWS KMS, etc.)
- [ ] Encrypt sensitive fields: NRIC, addresses
- [ ] Use TLS 1.2+ for all connections
- [ ] Rotate encryption keys annually
- [ ] Document encryption procedures

### 2. Access Control
**Status:** ✅ MOSTLY DONE

**What's protected:**
- ✅ Authentication required for all endpoints
- ✅ Users can only see their own data
- ❌ Admin access controls not fully defined
- ❌ Role-based access control (RBAC) not finalized

**You need to:**
- [ ] Define admin roles and permissions
- [ ] Implement multi-factor authentication (MFA)
- [ ] Set up audit logging for admin actions
- [ ] Restrict database access to backend only
- [ ] Implement IP whitelisting for admin access

### 3. Payment Security (PCI Compliance)
**Status:** ✅ DONE (Stripe handles it)

**Stripe advantages:**
- ✅ PCI-DSS Level 1 certified
- ✅ Handles card data encryption
- ✅ You never see card numbers
- ✅ Tokenized payments are safe

**You still need to:**
- [ ] Use Stripe Elements (not your own form)
- [ ] Verify webhook signatures
- [ ] Log payment events (NOT card data)
- [ ] Never log or store card numbers
- [ ] Use HTTPS only (no HTTP)
- [ ] Implement webhook retry logic

### 4. API Security
**Status:** ⚠️ PARTIAL

**Implemented:**
- ✅ JWT token authentication
- ✅ Rate limiting framework exists
- ❌ Rate limiting not fully configured
- ❌ Request validation incomplete

**You need to:**
- [ ] Enable rate limiting:
  - 100 requests/min per user (general)
  - 5 requests/min for auth endpoints
  - 10 requests/min for payment endpoints
- [ ] Validate all input data
- [ ] Set security headers:
  - `Strict-Transport-Security: max-age=31536000`
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Content-Security-Policy`

### 5. Data Privacy
**Status:** ⚠️ NEEDS WORK

**Current protections:**
- ✅ Users own their own data
- ✅ No unnecessary data collection
- ❌ No data retention limits
- ❌ No deletion mechanism
- ❌ No audit logs for data access

**You need to implement:**
- [ ] Data retention policy:
  - Delete inactive accounts after 2 years
  - Delete completed task data after 3 years
  - Delete payment records after 7 years (tax)
- [ ] User data deletion:
  - "Delete my account" button
  - Export data feature (PDPA right)
  - Deletion takes 30 days (time to recover)
- [ ] Audit logging:
  - Log who accessed what data
  - Log when data was modified
  - Log admin actions
  - Retain logs for 1 year

### 6. Breach Response
**Status:** ❌ NOT DOCUMENTED

**You need:**
- [ ] Breach response plan (written document)
- [ ] Contact info for security team
- [ ] Notification procedures
- [ ] Incident log template
- [ ] Legal consultation process
- [ ] PDPA breach notification timeline (within 30 days)

---

## 📊 Compliance Checklist

### Before Beta Testing
- [ ] Privacy Policy drafted
- [ ] Terms & Conditions drafted
- [ ] Service Agreement drafted
- [ ] Legal review completed
- [ ] Data encryption enabled
- [ ] Rate limiting configured
- [ ] Security headers set
- [ ] Webhook verification working

### Before Public Launch
- [ ] All legal documents signed by lawyer
- [ ] PDPA compliance audit completed
- [ ] Security audit by third party
- [ ] Penetration testing completed
- [ ] Disaster recovery plan written
- [ ] Incident response plan written
- [ ] Data retention policy implemented
- [ ] User deletion feature working
- [ ] Audit logging implemented
- [ ] Monitoring and alerting set up

---

## 🚨 Immediate Actions (Do This NOW)

### 1. Get a Singapore Lawyer
**Cost:** $2,000-5,000
**Timeline:** 2-3 weeks

**Their job:**
- Draft T&Cs, Privacy Policy, Service Agreement
- Review payment processing (Stripe)
- Ensure PDPA compliance
- Review user data handling

**Find one:**
- Singapore Law Society recommendations
- Startup law services (e.g., AXION, Ethos Law)
- Get 3 quotes, pick best value

### 2. Security Audit
**Cost:** $2,000-10,000
**Timeline:** 1-2 weeks (after dev complete)

**They'll check:**
- Code security (vulnerability scanning)
- API security
- Database security
- Encryption implementation
- Rate limiting & access control
- OWASP Top 10 compliance

**Find one:**
- CERT Singapore approved providers
- Bugcrowd, HackerOne
- Local cybersecurity firms

### 3. Document Your Policies
**Cost:** Time only
**Timeline:** 1 week

**Create documents:**
- Data retention policy
- Breach response plan
- Acceptable use policy
- Access control procedures
- Disaster recovery plan

---

## 💰 Total Legal & Security Cost Estimate

| Item | Cost | Timeline |
|------|------|----------|
| Lawyer (T&C, Privacy, etc) | $2,000-5,000 | 2-3 weeks |
| Security Audit | $2,000-10,000 | 1-2 weeks |
| SSL Certificate | $0-200/year | Already done |
| MFA Implementation | Time only | 1 week |
| Monitoring/Logging | $100-500/month | Ongoing |
| **Total** | **$4,000-15,000** | **4-5 weeks** |

---

## ⚖️ Legal Liability Summary

### Without proper legal/security setup:
- 🚨 **PDPA Violations** → SGD 1,000,000 fine + jail time
- 🚨 **Data Breach** → SGD 100,000s in damages
- 🚨 **Payment Issues** → Stripe account terminated
- 🚨 **Tax Issues** → Need to track & report all payments

### With proper setup:
- ✅ Protected from liability
- ✅ User trust increased
- ✅ Can scale safely
- ✅ Ready for investment

---

## 📋 Pre-Launch Checklist (60 Days Before)

### Week 1-2: Legal
- [ ] Meet with lawyer
- [ ] Discuss T&Cs, Privacy Policy, Service Agreement
- [ ] Discuss PDPA compliance
- [ ] Get cost estimate

### Week 3-4: Documentation
- [ ] Write data retention policy
- [ ] Write breach response plan
- [ ] Write access control procedures
- [ ] Document incident procedures

### Week 5-6: Security Implementation
- [ ] Configure rate limiting
- [ ] Set security headers
- [ ] Implement MFA
- [ ] Set up audit logging
- [ ] Enable database encryption

### Week 7-8: Testing & Audit
- [ ] Complete security audit
- [ ] Fix all security issues
- [ ] Legal review of documents
- [ ] Sign all legal documents
- [ ] Final security test

### Week 9: Go-Live Prep
- [ ] Publish Privacy Policy
- [ ] Publish T&Cs
- [ ] Set up monitoring
- [ ] Prepare incident response
- [ ] Brief team on security procedures

---

## 🎯 Risk Mitigation

### Payment Risk
**Risk:** Stripe account suspended for policy violations
**Mitigation:** 
- Use Stripe Elements (not your form)
- Never store card data
- Verify all webhooks
- Document all transactions
- Regular Stripe compliance reviews

### Data Breach Risk
**Risk:** User data leaked/stolen
**Mitigation:**
- Encrypt all sensitive data
- Regular backups (daily)
- Disaster recovery testing
- Incident response plan
- Cyber insurance (SGD 500-2,000/year)

### Legal Risk
**Risk:** Sued for privacy violations
**Mitigation:**
- Clear privacy policy
- Valid user consent
- Regular compliance audits
- Professional liability insurance
- Legal counsel on retainer

### Reputation Risk
**Risk:** Bad press from security/privacy issues
**Mitigation:**
- Transparent communication
- Quick response to issues
- Regular security updates
- User education
- Proactive security monitoring

---

## 🔒 Security Best Practices (During Development)

### Code Security
- ✅ Use parameterized queries (no SQL injection)
- ✅ Validate all input data
- ✅ Use HTTPS only
- ✅ Never hardcode secrets
- ✅ Keep dependencies updated
- ✅ Use security linter (ESLint security plugins)

### Data Security
- ✅ Hash passwords (bcrypt, argon2)
- ✅ Encrypt sensitive data
- ✅ TLS for all connections
- ✅ Never log passwords/tokens/card data
- ✅ Minimal data collection
- ✅ User data ownership

### Access Security
- ✅ Authentication required
- ✅ Authorization checked
- ✅ Role-based access control
- ✅ Audit logging
- ✅ Regular access reviews

---

## ✅ Final Security Checklist

Before going live:
- [ ] Privacy Policy approved by lawyer
- [ ] Terms & Conditions approved by lawyer
- [ ] Service Agreement approved by lawyer
- [ ] PDPA compliance verified
- [ ] Security audit completed
- [ ] All security issues fixed
- [ ] Penetration testing done
- [ ] Data encryption enabled
- [ ] Rate limiting enabled
- [ ] Security headers set
- [ ] MFA implemented
- [ ] Audit logging working
- [ ] Backup procedures tested
- [ ] Disaster recovery plan written
- [ ] Incident response plan ready
- [ ] Team trained on security
- [ ] Monitoring/alerting set up
- [ ] Insurance obtained
- [ ] Legal counsel on retainer

---

## 📞 Resources

### Singapore Legal
- Singapore Law Society: lawsociety.org.sg
- AXION Law: axiondrive.com
- Ethos Law: ethos.sg
- Singapore PDPA: pdpc.gov.sg

### Security
- CERT Singapore: cert.gov.sg
- OWASP: owasp.org
- Stripe Security: stripe.com/security

### Insurance
- CHUBB Cyber Insurance
- AXA Cyber Insurance
- Intact Cyber Insurance

---

## ⚠️ DO NOT LAUNCH WITHOUT:

1. **Legal Review** - T&Cs, Privacy Policy signed off
2. **PDPA Compliance** - Privacy audit done
3. **Security Audit** - Third-party review completed
4. **Encryption** - Data protection in place
5. **Monitoring** - Breach detection enabled
6. **Incident Plan** - Response procedures documented
7. **Insurance** - Cyber insurance policy
8. **Backups** - Tested & working

**Skipping any of these could result in legal action, fines, or shutdown.**

---

**Recommendation: Budget SGD 5,000-15,000 and 4-5 weeks for full legal and security compliance before public launch.**

This is NOT optional. This is business-critical. 🔒⚖️

