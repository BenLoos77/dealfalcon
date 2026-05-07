// /lib/supabase.js
// Supabase-Client für Vercel Serverless Functions

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY');
}

// Anon-Client für Auth-checks (mit User-Token)
function getUserClient(authHeader) {
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: token ? { Authorization: `Bearer ${token}` } : {} },
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

// Service-Role-Client (alle Rechte, NIEMALS dem Client schicken)
function getServiceClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

// User aus Auth-Header holen
async function getUserFromRequest(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader) return null;
  const supabase = getUserClient(authHeader);
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

// User + Profil + Workspace holen (häufiger Use-Case)
async function getUserContext(req) {
  const user = await getUserFromRequest(req);
  if (!user) return null;
  const service = getServiceClient();
  const { data: profile } = await service
    .from('profiles')
    .select('*, workspace:workspaces(*)')
    .eq('id', user.id)
    .single();
  if (!profile) return null;
  return { user, profile, workspaceId: profile.workspace_id };
}

// JSON-Response Helper
function json(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

function ok(res, data) { return json(res, 200, data); }
function badRequest(res, msg) { return json(res, 400, { error: msg }); }
function unauthorized(res, msg) { return json(res, 401, { error: msg || 'Unauthorized' }); }
function forbidden(res, msg) { return json(res, 403, { error: msg || 'Forbidden' }); }
function notFound(res, msg) { return json(res, 404, { error: msg || 'Not Found' }); }
function serverError(res, err) {
  console.error('Server error:', err);
  return json(res, 500, { error: 'Server error', detail: String(err && err.message || err) });
}

// Body parsen (manche Vercel-Configs liefern den nicht automatisch)
async function parseBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      if (!data) return resolve({});
      try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

module.exports = {
  getUserClient,
  getServiceClient,
  getUserFromRequest,
  getUserContext,
  ok, json, badRequest, unauthorized, forbidden, notFound, serverError,
  parseBody
};
