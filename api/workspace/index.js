// /api/workspace/index.js
// GET = workspace lesen, PATCH = workspace aktualisieren (brand, company)

const { getUserContext, getServiceClient, ok, unauthorized, forbidden, serverError, parseBody } = require('../../lib/supabase.js');

module.exports = async (req, res) => {
  try {
    const ctx = await getUserContext(req);
    if (!ctx) return unauthorized(res);
    const service = getServiceClient();

    if (req.method === 'GET') {
      const { data, error } = await service.from('workspaces').select('*').eq('id', ctx.workspaceId).single();
      if (error) return serverError(res, error);
      return ok(res, { workspace: data });
    }

    if (req.method === 'PATCH') {
      if (ctx.profile.role !== 'admin') return forbidden(res, 'Nur Admins dürfen den Workspace bearbeiten');
      const body = await parseBody(req);
      const allowed = ['name', 'plan', 'brand', 'company'];
      const update = {};
      for (const key of allowed) {
        if (body[key] !== undefined) update[key] = body[key];
      }
      update.updated_at = new Date().toISOString();
      const { data, error } = await service
        .from('workspaces').update(update).eq('id', ctx.workspaceId).select('*').single();
      if (error) return serverError(res, error);
      return ok(res, { workspace: data });
    }

    res.statusCode = 405;
    return res.end('Method not allowed');
  } catch (err) {
    return serverError(res, err);
  }
};
