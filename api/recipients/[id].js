// /api/recipients/[id].js

const { getUserContext, getServiceClient, ok, badRequest, unauthorized, notFound, serverError, parseBody } = require('../../lib/supabase.js');

module.exports = async (req, res) => {
  try {
    const ctx = await getUserContext(req);
    if (!ctx) return unauthorized(res);
    const service = getServiceClient();
    const recId = req.query.id;
    if (!recId) return badRequest(res, 'Recipient-ID fehlt');

    // Recipient holen + Workspace-Check über deal
    const { data: rec } = await service
      .from('recipients')
      .select('*, deal:deals(workspace_id)')
      .eq('id', recId)
      .single();
    if (!rec) return notFound(res, 'Empfänger nicht gefunden');
    if (rec.deal.workspace_id !== ctx.workspaceId) return unauthorized(res, 'Kein Zugriff');

    if (req.method === 'PATCH') {
      const body = await parseBody(req);
      const allowed = ['name', 'email', 'company', 'position', 'role', 'persona', 'forward_comment'];
      const update = {};
      for (const key of allowed) {
        if (body[key] !== undefined) update[key] = body[key];
      }
      const { data: updated, error } = await service
        .from('recipients')
        .update(update)
        .eq('id', recId)
        .select('*')
        .single();
      if (error) return serverError(res, error);
      return ok(res, { recipient: updated });
    }

    if (req.method === 'DELETE') {
      const { error } = await service.from('recipients').delete().eq('id', recId);
      if (error) return serverError(res, error);
      return ok(res, { success: true });
    }

    res.statusCode = 405;
    return res.end('Method not allowed');
  } catch (err) {
    return serverError(res, err);
  }
};
