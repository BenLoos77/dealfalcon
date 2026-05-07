// /api/auth/me.js
const { getUserContext, ok, unauthorized, serverError } = require('../../lib/supabase.js');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.statusCode = 405;
    return res.end('Method not allowed');
  }
  try {
    const ctx = await getUserContext(req);
    if (!ctx) return unauthorized(res, 'Nicht eingeloggt');
    return ok(res, {
      user: { id: ctx.user.id, email: ctx.user.email },
      profile: ctx.profile,
      workspace: ctx.profile.workspace
    });
  } catch (err) {
    return serverError(res, err);
  }
};
