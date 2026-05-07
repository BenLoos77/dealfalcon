// /api/customers/index.js

const { getUserContext, getServiceClient, ok, badRequest, unauthorized, serverError, parseBody } = require('../../lib/supabase.js');

module.exports = async (req, res) => {
  try {
    const ctx = await getUserContext(req);
    if (!ctx) return unauthorized(res);
    const service = getServiceClient();

    if (req.method === 'GET') {
      const { data, error } = await service
        .from('customers')
        .select('*')
        .eq('workspace_id', ctx.workspaceId)
        .order('company_name');
      if (error) return serverError(res, error);
      return ok(res, { customers: data || [] });
    }

    if (req.method === 'POST') {
      const body = await parseBody(req);
      if (!body.company_name) return badRequest(res, 'company_name erforderlich');
      const { data, error } = await service
        .from('customers')
        .insert({
          workspace_id: ctx.workspaceId,
          company_name: body.company_name,
          customer_number: body.customer_number || null,
          address: body.address || null,
          comment: body.comment || null,
          contacts: body.contacts || [],
          lead_user_id: ctx.profile.id
        })
        .select('*')
        .single();
      if (error) return serverError(res, error);
      return ok(res, { customer: data });
    }

    res.statusCode = 405;
    return res.end('Method not allowed');
  } catch (err) {
    return serverError(res, err);
  }
};
