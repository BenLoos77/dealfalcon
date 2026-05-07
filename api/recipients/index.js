// /api/recipients/index.js
// POST = neuer Empfänger, gehört immer zu einem Deal

const { getUserContext, getServiceClient, ok, badRequest, unauthorized, serverError, parseBody } = require('../../lib/supabase.js');

module.exports = async (req, res) => {
  try {
    const ctx = await getUserContext(req);
    if (!ctx) return unauthorized(res);
    const service = getServiceClient();

    if (req.method !== 'POST') {
      res.statusCode = 405;
      return res.end('Method not allowed');
    }

    const body = await parseBody(req);
    if (!body.deal_id || !body.name || !body.email) {
      return badRequest(res, 'deal_id, name, email erforderlich');
    }

    // Workspace-Check über deal
    const { data: deal } = await service
      .from('deals')
      .select('workspace_id')
      .eq('id', body.deal_id)
      .single();
    if (!deal || deal.workspace_id !== ctx.workspaceId) {
      return unauthorized(res, 'Kein Zugriff auf Deal');
    }

    const { data: recipient, error } = await service
      .from('recipients')
      .insert({
        deal_id: body.deal_id,
        name: body.name,
        email: body.email,
        company: body.company || '',
        position: body.position || '',
        role: body.role || 'primary',
        persona: body.persona || 'normal',
        contact_id: body.contact_id || null,
        forwarded_by: body.forwarded_by || null,
        forward_comment: body.forward_comment || null
      })
      .select('*')
      .single();
    if (error) return serverError(res, error);
    return ok(res, { recipient });
  } catch (err) {
    return serverError(res, err);
  }
};
