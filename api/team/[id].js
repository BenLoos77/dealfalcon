// /api/team/[id].js

const { getUserContext, getServiceClient, ok, badRequest, unauthorized, forbidden, notFound, serverError, parseBody } = require('../../lib/supabase.js');

module.exports = async (req, res) => {
  try {
    const ctx = await getUserContext(req);
    if (!ctx) return unauthorized(res);
    const service = getServiceClient();
    const id = req.query.id;
    if (!id) return badRequest(res, 'Member-ID fehlt');

    const { data: existing } = await service.from('profiles').select('*').eq('id', id).single();
    if (!existing) return notFound(res, 'Mitglied nicht gefunden');
    if (existing.workspace_id !== ctx.workspaceId) return unauthorized(res);

    if (req.method === 'PATCH') {
      if (ctx.profile.role !== 'admin' && ctx.profile.id !== id) {
        return forbidden(res, 'Nur Admins oder das Mitglied selbst dürfen bearbeiten');
      }
      const body = await parseBody(req);
      const allowed = ['name', 'role', 'status', 'vacation_active', 'vacation_from', 'vacation_to', 'vacation_delegate_id'];
      const update = {};
      for (const key of allowed) {
        if (body[key] !== undefined) update[key] = body[key];
      }
      const { data, error } = await service.from('profiles').update(update).eq('id', id).select('*').single();
      if (error) return serverError(res, error);
      return ok(res, { member: data });
    }

    if (req.method === 'DELETE') {
      if (ctx.profile.role !== 'admin') return forbidden(res, 'Nur Admins dürfen Mitglieder entfernen');
      if (id === ctx.profile.id) return badRequest(res, 'Sie können sich nicht selbst entfernen');
      const { error } = await service.from('profiles').delete().eq('id', id);
      if (error) return serverError(res, error);
      return ok(res, { success: true });
    }

    res.statusCode = 405;
    return res.end('Method not allowed');
  } catch (err) {
    return serverError(res, err);
  }
};
