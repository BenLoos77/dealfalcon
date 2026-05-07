// /api/deals/[id].js
// GET = Deal lesen, PATCH = Deal aktualisieren, DELETE = Deal löschen

const { getUserContext, getServiceClient, ok, badRequest, unauthorized, notFound, serverError, parseBody } = require('../../lib/supabase.js');

module.exports = async (req, res) => {
  try {
    const ctx = await getUserContext(req);
    if (!ctx) return unauthorized(res);
    const service = getServiceClient();
    const dealId = req.query.id;
    if (!dealId) return badRequest(res, 'Deal-ID fehlt');

    // Deal holen + Workspace-Check
    const { data: existing } = await service
      .from('deals')
      .select('*, recipients(*), activities(*)')
      .eq('id', dealId)
      .single();
    if (!existing) return notFound(res, 'Deal nicht gefunden');
    if (existing.workspace_id !== ctx.workspaceId) return unauthorized(res, 'Kein Zugriff');

    if (req.method === 'GET') {
      return ok(res, { deal: existing });
    }

    if (req.method === 'PATCH') {
      const body = await parseBody(req);
      // Whitelist erlaubter Felder
      const allowed = [
        'title', 'value', 'status', 'customer', 'customer_company', 'customer_id',
        'description', 'delivery', 'payment', 'valid_until',
        'pdf_file', 'pdf_versions', 'folders', 'video_files',
        'closed_at', 'close_reason', 'close_note',
        'lead_user_id', 'collaborators', 'lead_history', 'temp_delegations',
        'notes', 'team_messages', 'section_timings', 'sent_at'
      ];
      const update = {};
      for (const key of allowed) {
        if (body[key] !== undefined) update[key] = body[key];
      }
      update.updated_at = new Date().toISOString();
      const { data: updated, error } = await service
        .from('deals')
        .update(update)
        .eq('id', dealId)
        .select('*, recipients(*), activities(*)')
        .single();
      if (error) return serverError(res, error);
      return ok(res, { deal: updated });
    }

    if (req.method === 'DELETE') {
      const { error } = await service.from('deals').delete().eq('id', dealId);
      if (error) return serverError(res, error);
      return ok(res, { success: true });
    }

    res.statusCode = 405;
    return res.end('Method not allowed');
  } catch (err) {
    return serverError(res, err);
  }
};
