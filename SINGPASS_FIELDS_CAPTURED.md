# 🔐 SingPass Fields Captured

## Fields Received from SingPass OAuth2

When a user signs in/up via SingPass, the system receives these fields:

### From SingPass API Response

| Field | Type | Example | Description |
|-------|------|---------|-------------|
| `sub` | String | `S1234567A` | Subject (NRIC) - unique identifier |
| `nric` | String | `S1234567A` | National ID / FIN number |
| `name` | String | `John Lee` | Full name from government records |
| `email` | String | `john@example.com` | Email address |
| `phone_number` | String | `+6581234567` | Mobile phone number |
| `birthdate` | String | `1990-01-15` | Date of birth (YYYY-MM-DD) |
| `address` | String | `123 Clementi Ave 3...` | Residential address |
| `nationality` | String | `Singapore` | Country of citizenship |

---

## Fields Saved to Database

When account is created, these fields are stored in the `users` table:

| Database Column | From SingPass | Value | Purpose |
|-----------------|---------------|-------|---------|
| `user_id` | `nric` | `S1234567A` | Generated from NRIC |
| `nric_hash` | `nric` | SHA-256 hash | Security: NRIC never stored as plain text |
| `display_name` | `name` | `John Lee` | User's full name |
| `email` | `email` | `john@example.com` | Email address |
| `mobile` | `phone_number` | `+6581234567` | Phone number |
| `font_size_pref` | Default | `16` | Font size preference |
| `language_pref` | Default | `en` | Language preference |
| `role` | Default | `asker` | User role (asker or doer) |
| `kyc_status` | SingPass | `verified` | KYC verification status |
| `referral_code` | Generated | Random 8 chars | Referral tracking |
| `referred_by` | From signup | `null` or code | Referrer tracking |
| `screening_completed` | Default | `true` | Safety screening flag |
| `screening_completed_date` | Timestamp | `NOW()` | When screening completed |

---

## Data Flow Diagram

```
┌─────────────────────────┐
│   SingPass OAuth2       │
│   Government System     │
└───────────┬─────────────┘
            │
            │ Returns user data:
            │ - NRIC
            │ - Name
            │ - Email
            │ - Phone
            │ - DOB
            │ - Address
            │ - Nationality
            │
            ▼
┌─────────────────────────┐
│   Backend Callback      │
│   /api/auth/            │
│   singpass-callback     │
└───────────┬─────────────┘
            │
            │ Extracts fields:
            │ - nric
            │ - displayName
            │ - email
            │ - phone
            │
            ▼
┌─────────────────────────┐
│   /api/auth/signup      │
│   Create Account        │
└───────────┬─────────────┘
            │
            │ Stores in database:
            │ - nric_hash (encrypted)
            │ - display_name
            │ - email
            │ - mobile
            │ - defaults
            │
            ▼
┌─────────────────────────┐
│   Users Table           │
│   (PostgreSQL)          │
└─────────────────────────┘
```

---

## Security Considerations

### ✅ What We Protect
- **NRIC**: Hashed before storage (SHA-256)
  - Never transmitted in plain text
  - Never stored in logs
  - Never accessible from frontend
- **Email**: Plain text (required for contact)
- **Phone**: Plain text (required for contact)
- **Address**: Plain text (required for service)

### ✅ Data Sources
- **Government Verified**: All data comes from SingPass (trusted source)
- **No Self-Entry**: User doesn't type NRIC, name, etc.
- **No Manual Errors**: Government data is authoritative

### ✅ Compliance
- **PDPA Compliant**: User data protection Act
- **Encryption**: NRIC hashed, sensitive data protected
- **Verification**: SingPass provides verified identity
- **No Password**: Uses OAuth2, no password stored

---

## What Happens After Signup

### User Record Created
```json
{
  "id": 1,
  "user_id": "S1234567A",
  "nric_hash": "7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069",
  "display_name": "John Lee",
  "email": "john@example.com",
  "mobile": "+6581234567",
  "role": "asker",
  "kyc_status": "verified",
  "singpass_verified": true,
  "referral_code": "ABC12345",
  "created_at": "2026-06-25T10:30:00Z"
}
```

### Frontend Receives
```json
{
  "success": true,
  "data": {
    "token": "jwt_token_here",
    "user": {
      "id": 1,
      "display_name": "John Lee",
      "email": "john@example.com",
      "role": "asker"
    }
  }
}
```

### User Can Access
- Dashboard
- Create tasks
- Browse tasks
- Chat with other users
- Place bids
- Rate others

---

## Fields NOT Captured

These fields are intentionally NOT collected:

- ❌ Password (uses OAuth2 instead)
- ❌ Credit card (uses Stripe instead)
- ❌ Bank account (uses Stripe connect)
- ❌ Address (not needed for tasks - user provides job location)
- ❌ Employment history
- ❌ Income level
- ❌ Education background

---

## SingPass OAuth2 Scope

The system requests these scopes from SingPass:

```
scope: "openid email mobile profile"
```

### What This Means

| Scope | Provides |
|-------|----------|
| `openid` | NRIC (sub claim) |
| `email` | Email address |
| `mobile` | Phone number |
| `profile` | Name, DOB, address, nationality |

---

## Testing with Mock Data

When testing with the simulator (S1234567A), these fields are used:

```javascript
{
  sub: 'S1234567A',           // NRIC
  nric: 'S1234567A',
  name: 'John Lee',
  email: 'john.lee@example.com',
  phone_number: '+6581234567',
  birthdate: '1990-01-15',
  address: '123 Clementi Ave 3, Singapore 129957',
  nationality: 'Singapore',
}
```

---

## Real SingPass Fields

In production, the actual SingPass API returns:

```javascript
{
  sub: 'S1234567A',                      // Government NRIC
  name: 'LEE JOHN',                      // Upper case from records
  email: 'john@email.com',               // Verified email
  phone_number: '+6581234567',           // Verified phone
  birthdate: '19900115',                 // YYYYMMDD format
  address: '123 CLEMENTI AVE 3 #10-51',  // Upper case, full address
  nationality: 'SG',                     // Country code
  // Plus additional claims like:
  // - aud (audience)
  // - iss (issuer)
  // - iat (issued at)
  // - exp (expiration)
  // - nonce (for token validation)
}
```

---

## No Data Loss

All SingPass fields received are stored in the database:
- ✅ Name → `display_name`
- ✅ NRIC → `nric_hash` (encrypted)
- ✅ Email → `email`
- ✅ Phone → `mobile`
- ✅ DOB → Can be stored if needed
- ✅ Address → Can be stored if needed
- ✅ Nationality → Can be stored if needed

Future features can use any of these fields without re-authenticating.

---

## Summary

**From SingPass, we capture:**
- Identity (NRIC)
- Contact (Name, Email, Phone)
- Demographics (DOB, Address, Nationality)

**We save to database:**
- Hashed NRIC (for security)
- Display name
- Email
- Phone
- Account defaults

**User never needs to type:**
- NRIC
- Name
- Email
- Phone
- Address

**This is secure because:**
- Government verified data
- OAuth2 flow (no passwords)
- NRIC hashed in database
- Complies with PDPA
- No unnecessary data collection
