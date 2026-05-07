// /api/customers/[id].js

const { getUserContext, getServiceClient, ok, badRequest, unauthorized, notFound, serverError, parseBody } = require('../../lib/supabase.js');

module.exports = async (req, res) => {
  try {
    const ctx = await getUserContext(req);
    if (!ctx) return unauthorized(res);
    const service = getServiceClient();
    const id = req.query.id;
    if (!id) return badRequest(res, 'Customer-ID fehlt');

    const { data: existing } = await service.from('customers').select('*').eq('id', id).single();
    if (!existing) return notFound(res, 'Kunde nicht gefunden');
    if (existing.workspace_id !== ctx.workspaceId) return unauthorized(res);

    if (req.method === 'PATCH') {
      const body = await parseBody(req);
      const allowed = ['company_name', 'customer_number', 'address', 'comment', 'contacts', 'lead_user_id'];
      const update = {};
      for (const key of allowed) {
        if (body[key] !== undefined) update[key] = body[key];
      }
      const { data, error } = await service
        .from('customers').update(update).eq('id', id).select('*').single();
      if (error) return serverError(res, error);
      return ok(res, { customer: data });
    }

    if (req.method === 'DELETE') {
      const { error } = await service.from('customers').delete().eq('id', id);
      if (error) return serverError(res, error);
      return ok(res, { success: true });
    }

    res.statusCode = 405;
    return res.end('Method not allowed');
  } catch (err) {
    return serverError(res, err);
  }
};
