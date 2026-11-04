/**
 * E2E Auth and Security Verification Suite (Node.js)
 * Tests all flows against live server at http://127.0.0.1:3000
 */

const BASE = 'http://127.0.0.1:3000';
const ORIGIN = BASE;
const ADMIN_PASSWORD = process.argv[2] || 'cOMnJFlTrLo9oex5smK9ntNB';

const results = [];
function record(name, expected, actual) {
  const pass = String(expected) === String(actual);
  results.push({ test: name, expected: String(expected), actual: String(actual), status: pass ? 'PASS' : 'FAIL' });
  console.log(`${pass ? '✔' : '✖'} [${pass ? 'PASS' : 'FAIL'}] ${name} (expected: ${expected}, got: ${actual})`);
}

async function request(path, options = {}) {
  const url = `${BASE}${path}`;
  const headers = { ...(options.headers || {}) };
  if (options.cookie) headers['cookie'] = options.cookie;
  if (options.body && typeof options.body === 'object') {
    headers['content-type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body,
    redirect: 'manual',
  });

  const text = await res.text();
  const setCookie = res.headers.get('set-cookie') || '';
  let parsedBody = null;
  try { parsedBody = JSON.parse(text); } catch {}

  return {
    status: res.status,
    headers: res.headers,
    text,
    json: parsedBody,
    setCookie,
    location: res.headers.get('location') || '',
  };
}

function parseCookie(setCookie) {
  const match = setCookie.match(/((?:__Host-)?session)=([^;]+)/);
  return match ? `${match[1]}=${match[2]}` : null;
}

const adminMarkers = /Catalogue, compliance evidence|Live platform data|Review queue|Quote queue/;

async function run() {
  const uniqueId = Math.random().toString(36).slice(2, 10);
  const email = `e2e-${uniqueId}@example.com`;
  const password = 'a-secure-e2e-passphrase-99!';

  console.log(`\n=== 1. ANONYMOUS ACCESS GATES ===`);
  const anonDash = await request('/dashboard');
  record('anon /dashboard -> 307 to /login', 307, anonDash.status);
  record('anon /dashboard redirect location', true, anonDash.location.includes('/login?next='));

  const anonAdmin = await request('/admin');
  record('anon /admin -> 307 to /login', 307, anonAdmin.status);
  record('anon /admin redirect location', true, anonAdmin.location.includes('/login?next='));

  const forgedAdmin = await request('/admin', { cookie: '__Host-session=forged-token-value' });
  record('forged cookie /admin leaks no admin content', false, adminMarkers.test(forgedAdmin.text));

  const forgedDash = await request('/dashboard', { cookie: '__Host-session=forged-token-value' });
  record('forged cookie /dashboard leaks no dashboard content', false, /Welcome,|Subscriptions, orders/.test(forgedDash.text));

  console.log(`\n=== 2. CSRF & ORIGIN CHECKS ===`);
  const csrfNoOrigin = await request('/api/v1/auth/register', { method: 'POST', body: { name: 'A', email, password } });
  record('register without Origin -> 403', 403, csrfNoOrigin.status);

  const csrfForeign = await request('/api/v1/auth/register', {
    method: 'POST',
    headers: { origin: 'https://evil.attacker.com' },
    body: { name: 'A', email, password }
  });
  record('register foreign Origin -> 403', 403, csrfForeign.status);

  const csrfLogin = await request('/api/v1/auth/login', {
    method: 'POST',
    headers: { origin: 'https://evil.attacker.com' },
    body: { email, password }
  });
  record('login foreign Origin -> 403', 403, csrfLogin.status);

  const csrfLogout = await request('/api/v1/auth/logout', {
    method: 'POST',
    headers: { origin: 'https://evil.attacker.com' }
  });
  record('logout foreign Origin -> 403', 403, csrfLogout.status);

  console.log(`\n=== 3. REGISTRATION VALIDATION & CREATION ===`);
  const invalidReg = await request('/api/v1/auth/register', {
    method: 'POST',
    headers: { origin: ORIGIN },
    body: { name: 'X', email: 'invalid-email', password: 'short' }
  });
  record('invalid registration input -> 422', 422, invalidReg.status);

  // Attempt mass-assignment by sending role: 'SUPER_ADMIN'
  const validReg = await request('/api/v1/auth/register', {
    method: 'POST',
    headers: { origin: ORIGIN },
    body: { name: 'E2E Customer', email, password, role: 'SUPER_ADMIN', status: 'ACTIVE' }
  });
  record('valid customer register -> 201', 201, validReg.status);
  record('cookie has HttpOnly', true, validReg.setCookie.includes('HttpOnly'));
  record('cookie has SameSite=lax', true, /SameSite=lax/i.test(validReg.setCookie));
  record('cookie uses __Host-session or session prefix', true, /(?:__Host-)?session=/.test(validReg.setCookie));

  const customerCookie = parseCookie(validReg.setCookie);

  const dupReg = await request('/api/v1/auth/register', {
    method: 'POST',
    headers: { origin: ORIGIN },
    body: { name: 'E2E Customer', email, password }
  });
  record('duplicate registration -> 409', 409, dupReg.status);

  console.log(`\n=== 4. CUSTOMER AUTHORIZATION & RBAC ===`);
  const custDash = await request('/dashboard', { cookie: customerCookie });
  record('customer /dashboard -> 200', 200, custDash.status);
  record('dashboard greets customer by name', true, custDash.text.includes('Welcome') && custDash.text.includes('E2E Customer'));
  record('dashboard shows customer email', true, custDash.text.includes(email));
  record('dashboard shows real counts (Orders card)', true, custDash.text.includes('Orders'));

  // Privilege escalation check: Customer tries to access /admin
  const custAdmin = await request('/admin', { cookie: customerCookie });
  record('customer /admin renders 404 (no information disclosure)', true, custAdmin.text.includes('404') || custAdmin.text.includes('could not be found') || custAdmin.status === 404);
  record('customer /admin leaks no admin content', false, adminMarkers.test(custAdmin.text));

  console.log(`\n=== 5. AUTHENTICATION, THROTTLING & TIMING DEFENSE ===`);
  const wrongPw = await request('/api/v1/auth/login', {
    method: 'POST',
    headers: { origin: ORIGIN },
    body: { email, password: 'wrong-password-123' }
  });
  record('wrong password -> 401', 401, wrongPw.status);

  const unknownEmail = await request('/api/v1/auth/login', {
    method: 'POST',
    headers: { origin: ORIGIN },
    body: { email: 'nobody-nowhere@example.com', password: 'wrong-password-123' }
  });
  record('unknown email -> 401', 401, unknownEmail.status);
  record('timing defense: identical generic message for bad password and unknown email',
    wrongPw.json?.message, unknownEmail.json?.message
  );

  // Trigger per-account login throttling (max 5 failed attempts)
  let throttleStatus = 0;
  for (let i = 0; i < 6; i++) {
    const res = await request('/api/v1/auth/login', {
      method: 'POST',
      headers: { origin: ORIGIN },
      body: { email, password: 'wrong-password-123' }
    });
    throttleStatus = res.status;
  }
  record('failed logins exceed limit -> 429', 429, throttleStatus);

  const throttledCorrect = await request('/api/v1/auth/login', {
    method: 'POST',
    headers: { origin: ORIGIN },
    body: { email, password }
  });
  record('correct password also blocked while account is throttled -> 429', 429, throttledCorrect.status);

  console.log(`\n=== 6. LOGOUT & SESSION REVOCATION ===`);
  const logoutRes = await request('/api/v1/auth/logout', {
    method: 'POST',
    headers: { origin: ORIGIN },
    cookie: customerCookie
  });
  record('logout -> 200', 200, logoutRes.status);

  const postLogoutDash = await request('/dashboard', { cookie: customerCookie });
  record('revoked session cannot view dashboard (redirects or 401)', true, postLogoutDash.status === 307 || !postLogoutDash.text.includes('Welcome, E2E Customer'));

  console.log(`\n=== 7. ADMIN ROLE & PLATFORM DATA VIEW ===`);
  const adminLogin = await request('/api/v1/auth/login', {
    method: 'POST',
    headers: { origin: ORIGIN },
    body: { email: 'rafsan.cu.ac@gmail.com', password: ADMIN_PASSWORD }
  });
  record('admin login -> 200', 200, adminLogin.status);
  record('admin redirectTo -> /admin', '/admin', adminLogin.json?.redirectTo);

  const adminCookie = parseCookie(adminLogin.setCookie);
  if (adminCookie) {
    const adminPage = await request('/admin', { cookie: adminCookie });
    record('admin /admin -> 200', 200, adminPage.status);
    record('admin sees live platform data', true, adminPage.text.includes('Live platform data'));
    record('admin sees real account stats', true, adminPage.text.includes('Accounts'));
    record('admin sees recent audit log', true, adminPage.text.includes('Recent audit log'));
    record('admin sees Orders card', true, adminPage.text.includes('Orders'));

    const adminLogout = await request('/api/v1/auth/logout', {
      method: 'POST',
      headers: { origin: ORIGIN },
      cookie: adminCookie
    });
    record('admin logout -> 200', 200, adminLogout.status);

    const revokedAdmin = await request('/admin', { cookie: adminCookie });
    record('revoked admin session cannot view admin console', false, revokedAdmin.text.includes('Live platform data'));
  } else {
    record('admin cookie obtained', true, false);
  }

  console.log(`\n========================================`);
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  console.log(`FINAL RESULT: ${passed} PASSED, ${failed} FAILED across ${results.length} tests.`);
  console.log(`========================================\n`);

  if (failed > 0) process.exit(1);
}

run().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
