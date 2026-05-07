// /api/deals/index.js
// GET = alle Deals des Workspaces, POST = neuen Deal anlegen

const { getUserContext, getServiceClient, ok, badRequest, unauthorized, serverError, parseBody } = require('../../lib/supabase.js');

module.exports = async (req, res) => {
  try {
    const ctx = await getUserContext(req);
    if (!ctx) return unauthorized(res);
    const service = getServiceClient();

    if (req.method === 'GET') {
      const { data: deals, error } = await service
        .from('deals')
        .select('*, recipients(*), activities(*)')
        .eq('workspace_id', ctx.workspaceId)
        .order('created_at', { ascending: false });
      if (error) return serverError(res, error);
      return ok(res, { deals: deals || [] });
    }

    if (req.method === 'POST') {
      const body = await parseBody(req);
      const dealNum = body.deal_number || generateDealNumber();
      const { data: deal, error } = await service
        .from('deals')
        .insert({
          workspace_id: ctx.workspaceId,
          deal_number: dealNum,
          title: body.title || '',
          value: body.value || 0,
          status: body.status || 'draft',
          customer: body.customer || '',
          customer_company: body.customer_company || '',
          customer_id: body.customer_id || null,
          description: body.description || '',
          delivery: body.delivery || '',
          payment: body.payment || '',
          valid_until: body.valid_until || '',
          lead_user_id: ctx.profile.id
        })
        .select('*')
        .single();
      if (error) return serverError(res, error);
      return ok(res, { deal });
    }

    res.statusCode = 405;
    return res.end('Method not allowed');
  } catch (err) {
    return serverError(res, err);
  }
};

function generateDealNumber() {
  const year = new Date().getFullYear();
  const rand = String(Math.floor(Math.random() * 9000) + 1000);
  return `${year}-${rand}`;
}
