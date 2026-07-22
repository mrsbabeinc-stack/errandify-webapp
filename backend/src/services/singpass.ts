import * as jose from 'jose';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

/**
 * Singpass Login (NDI OIDC).
 *
 * The user authenticates on SINGPASS'S OWN SCREEN, on Singpass's domain. We
 * only redirect there and handle what comes back. We never render a Singpass
 * login form and never ask anyone to type an NRIC into our app — a form on our
 * domain asking for an NRIC is a phishing pattern however it is styled.
 *
 * Rewritten against the live staging discovery document, which the previous
 * implementation did not match:
 *
 *   was https://api-dev.singpass.gov.sg   ->  https://stg-id.singpass.gov.sg
 *   was /authorize, /oauth/token          ->  /auth, /token
 *   sent no client_assertion              ->  private_key_jwt is the ONLY auth
 *                                             method Singpass accepts, so token
 *                                             exchange could never have worked
 *   called /userinfo with a bearer token  ->  identity arrives in the id_token
 *   never decrypted or verified anything  ->  id_token is a JWE (ECDH-ES+A256KW)
 *                                             wrapping a JWS (ES256); both steps
 *                                             are required or we would accept a
 *                                             token from anyone
 *   Math.random() for state and nonce     ->  crypto.randomUUID; state is our
 *                                             CSRF defence and must not be
 *                                             guessable
 *   scope 'openid email mobile profile'   ->  those are not Singpass scopes
 *
 * There is no client secret anywhere in this flow. We authenticate by signing a
 * short-lived assertion with our own private key; Singpass verifies it against
 * the public JWKS we publish. That is why backend/keys matters and is gitignored.
 */

const DISCOVERY_TTL_MS = 60 * 60 * 1000;

interface Discovery {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri: string;
}

let cachedDiscovery: { at: number; doc: Discovery } | null = null;
let cachedJwks: ReturnType<typeof jose.createRemoteJWKSet> | null = null;

function env() {
  return {
    issuerUrl: process.env.SINGPASS_ISSUER || 'https://stg-id.singpass.gov.sg',
    clientId: process.env.SINGPASS_CLIENT_ID || 'STG-202531346W-LOGIN-Errand-d8ZpLL',
    // Must match exactly what is registered with Singpass, or /auth rejects it
    redirectUri: process.env.SINGPASS_REDIRECT_URI || 'https://app-dev.errandify.ai/register-sing-pass',
    enabled: process.env.USE_SINGPASS === 'true',
  };
}

/** Private JWKS lives on disk, outside git. Loaded on demand, never logged. */
function privateJwks(): { keys: any[] } {
  const p = path.resolve(process.cwd(), 'keys/singpass-private.jwks.json');
  if (!fs.existsSync(p)) {
    throw new Error('Singpass private keys not found — generate them before enabling Singpass.');
  }
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

/** Served at the JWKS URL registered with Singpass. Public halves only. */
export function publicJwks(): { keys: any[] } {
  const p = path.resolve(process.cwd(), 'keys/singpass-public.jwks.json');
  if (!fs.existsSync(p)) return { keys: [] };
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function keyFor(use: 'sig' | 'enc') {
  const k = privateJwks().keys.find((x: any) => x.use === use);
  if (!k) throw new Error(`No Singpass ${use} key configured`);
  return k;
}

export async function discovery(): Promise<Discovery> {
  if (cachedDiscovery && Date.now() - cachedDiscovery.at < DISCOVERY_TTL_MS) {
    return cachedDiscovery.doc;
  }
  const res = await fetch(`${env().issuerUrl}/.well-known/openid-configuration`);
  if (!res.ok) throw new Error(`Singpass discovery failed: ${res.status}`);
  const doc = (await res.json()) as Discovery;
  cachedDiscovery = { at: Date.now(), doc };
  return doc;
}

/** Unguessable — state is the CSRF defence and nonce is the replay defence. */
export function makeStateAndNonce() {
  return { state: crypto.randomUUID(), nonce: crypto.randomUUID() };
}

/** Where to send the user. They authenticate on Singpass; we never see credentials. */
export async function buildAuthorizeUrl(params: { state: string; nonce: string }): Promise<string> {
  const { clientId, redirectUri } = env();
  if (!clientId || !redirectUri) {
    throw new Error('SINGPASS_CLIENT_ID and SINGPASS_REDIRECT_URI must be set');
  }
  const d = await discovery();
  const url = new URL(d.authorization_endpoint);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', 'openid');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('state', params.state);
  url.searchParams.set('nonce', params.nonce);
  return url.toString();
}

/** A short-lived JWT signed with our private key. This replaces a client secret. */
async function clientAssertion(audience: string): Promise<string> {
  const { clientId } = env();
  const jwk = keyFor('sig');
  const key = await jose.importJWK(jwk, 'ES256');

  return new jose.SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: jwk.kid })
    .setIssuer(clientId)
    .setSubject(clientId)
    .setAudience(audience)
    .setJti(crypto.randomUUID())
    .setIssuedAt()
    .setExpirationTime('2m')
    .sign(key);
}

export interface SingpassIdentity {
  /** NRIC or FIN as asserted by Singpass — never typed by the user */
  uinfin: string;
  /** raw sub claim, kept for audit */
  sub: string;
}

/**
 * Exchange the code and unwrap the id_token: decrypt the JWE with our key, then
 * verify the inner JWS against Singpass's published keys. Both steps matter —
 * decrypting without verifying would accept a token from anybody.
 */
export async function exchangeCode(code: string, expectedNonce: string): Promise<SingpassIdentity> {
  const { clientId, redirectUri } = env();
  const d = await discovery();

  const res = await fetch(d.token_endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      redirect_uri: redirectUri,
      client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
      client_assertion: await clientAssertion(d.issuer),
    }),
  });
  if (!res.ok) {
    throw new Error(`Singpass token exchange failed: ${res.status} ${(await res.text()).slice(0, 200)}`);
  }

  const tokens = (await res.json()) as { id_token?: string };
  if (!tokens.id_token) throw new Error('Singpass returned no id_token');

  // 1. decrypt the JWE with our private encryption key
  const decKey = await jose.importJWK(keyFor('enc'), 'ECDH-ES+A256KW');
  const { plaintext } = await jose.compactDecrypt(tokens.id_token, decKey);

  // 2. verify the inner JWS against Singpass's public keys
  if (!cachedJwks) cachedJwks = jose.createRemoteJWKSet(new URL(d.jwks_uri));
  const { payload } = await jose.jwtVerify(new TextDecoder().decode(plaintext), cachedJwks, {
    issuer: d.issuer,
    audience: clientId,
  });

  if (payload.nonce !== expectedNonce) {
    throw new Error('Singpass nonce mismatch — possible replay');
  }

  // sub looks like: s=S1234567A,u=<uuid>. F/G/M prefixes are FIN holders, who
  // use Singpass exactly as citizens and PRs do.
  const sub = String(payload.sub || '');
  const uinfin = /[su]=([STFGM]\d{7}[A-Z])/i.exec(sub)?.[1];
  if (!uinfin) throw new Error('Could not read the identity from the Singpass token');

  return { uinfin: uinfin.toUpperCase(), sub };
}

/**
 * The only thing we store. The raw NRIC/FIN is hashed immediately and never
 * persisted — the same hash the invite flow already looks people up by.
 */
export function hashUinfin(uinfin: string): string {
  return crypto.createHash('sha256').update(uinfin.trim().toUpperCase()).digest('hex');
}

export function singpassEnabled(): boolean {
  const e = env();
  return e.enabled && !!e.clientId && !!e.redirectUri;
}
