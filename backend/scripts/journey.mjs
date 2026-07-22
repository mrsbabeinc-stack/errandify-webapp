import { execSync } from 'child_process';
const B = 'http://localhost:3000';
export const tok = (id, role) => execSync(
  `node -e "const jwt=require('jsonwebtoken');require('dotenv').config();console.log(jwt.sign({userId:'${id}',id:${id}${role?`,role:'${role}'`:''}},process.env.JWT_SECRET,{expiresIn:'3h'}))"`,
  { encoding: 'utf8' }).trim().split('\n').pop();
export async function call(verb, path, token, body) {
  const r = await fetch(B + path, {
    method: verb,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  let j; try { j = await r.json(); } catch { j = { _raw: 'non-json' }; }
  return { status: r.status, body: j };
}
export const results = [];
export function step(name, res, ok) {
  const pass = typeof ok === 'function' ? ok(res) : (res.status >= 200 && res.status < 300);
  results.push({ name, pass, status: res.status,
    detail: pass ? '' : JSON.stringify(res.body).slice(0, 110) });
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${name}${pass ? '' : '  -> ' + JSON.stringify(res.body).slice(0,100)}`);
  return pass;
}
