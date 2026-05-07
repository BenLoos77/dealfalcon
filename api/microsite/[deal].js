// /api/microsite/[deal].js
// Öffentlicher Endpunkt — KEIN Login erforderlich, weil Empfänger ohne Account zugreifen
// Sicherheit über die schwer-erratbare deal_id (UUID)

const { getServiceClient, ok, badRequest, notFound, serverError } = require('../../lib/supabase.js');

module.exports = async (req, res) => {
  try {
    if (req.method !== 'GET') {
      res.statusCode = 405;
      return res.end('Method not allowed');
    }

    const dealId = req.query.deal;
    const recipientId = req.query.r || req.query.recipient;
    if (!dealId) return badRequest(res, 'Deal-ID fehlt');

    const service = getServiceClient();

    // Deal lesen mit allem was die Microsite braucht
    const { data: deal, error: dErr } = await service
      .from('deals')
      .select(`
        id, deal_number, title, value, status, customer, customer_company,
        description, delivery, payment, valid_until,
        pdf_file, pdf_versions, folders, video_files,
        sent_at, closed_at, close_reason,
        recipients(*),
        workspace:workspaces(name, brand, company)
      `)
      .eq('id', dealId)
      .single();

    if (dErr || !deal) return notFound(res, 'Vorgang nicht gefunden');
    if (deal.status === 'draft') return notFound(res, 'Vorgang noch nicht versendet');

    // Recipient-Check
    let recipient = null;
    if (recipientId) {
      recipient = (deal.recipients || []).find(r => r.id === recipientId);
      if (!recipient) return notFound(res, 'Empfänger nicht gefunden');
    } else {
      // Wenn kein recipient angegeben, nimm den primären
      recipient = (deal.recipients || []).find(r => r.role === 'primary');
    }

    return ok(res, { deal, recipient });
  } catch (err) {
    return serverError(res, err);
  }
};
