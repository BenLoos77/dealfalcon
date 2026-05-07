// /api/activities/index.js
// POST = neue Activity (auch ohne Login möglich, für Empfänger-Tracking)

const { getServiceClient, ok, badRequest, serverError, parseBody } = require('../../lib/supabase.js');

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') {
      res.statusCode = 405;
      return res.end('Method not allowed');
    }

    const body = await parseBody(req);
    if (!body.deal_id || !body.type) {
      return badRequest(res, 'deal_id, type erforderlich');
    }

    const service = getServiceClient();
    // Sanity-Check: deal muss existieren
    const { data: deal } = await service.from('deals').select('id, workspace_id').eq('id', body.deal_id).single();
    if (!deal) return badRequest(res, 'Unbekannter Deal');

    const { data: activity, error } = await service
      .from('activities')
      .insert({
        deal_id: body.deal_id,
        recipient_id: body.recipient_id || null,
        type: body.type,
        detail: body.detail || null,
        metadata: body.metadata || {},
        simulated_at: body.simulated_at || new Date().toISOString()
      })
      .select('*')
      .single();
    if (error) return serverError(res, error);
    return ok(res, { activity });
  } catch (err) {
    return serverError(res, err);
  }
};
