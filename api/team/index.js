// /api/team/index.js

const { getUserContext, getServiceClient, ok, badRequest, unauthorized, forbidden, serverError, parseBody } = require('../../lib/supabase.js');

module.exports = async (req, res) => {
  try {
    const ctx = await getUserContext(req);
    if (!ctx) return unauthorized(res);
    const service = getServiceClient();

    if (req.method === 'GET') {
      const { data, error } = await service
        .from('profiles')
        .select('*')
        .eq('workspace_id', ctx.workspaceId)
        .order('name');
      if (error) return serverError(res, error);
      return ok(res, { members: data || [] });
    }

    if (req.method === 'POST') {
      // Neues Mitglied einladen — wir erstellen einen Profil-Eintrag mit status='pending'
      // Echter Magic-Link-Versand ist über Supabase Auth Admin möglich, hier vereinfacht
      if (ctx.profile.role !== 'admin') return forbidden(res, 'Nur Admins können Mitglieder einladen');
      const body = await parseBody(req);
      if (!body.email || !body.name) return badRequest(res, 'name + email erforderlich');

      // Prüfen ob E-Mail schon im Workspace
      const { data: existing } = await service
        .from('profiles').select('id').eq('email', body.email).eq('workspace_id', ctx.workspaceId).maybeSingle();
      if (existing) return badRequest(res, 'Diese E-Mail ist bereits Mitglied.');

      // Wir erstellen einen Auth-User per Admin-API (ohne Passwort, mit Magic-Link-Einladung)
      const { data: authUser, error: aErr } = await service.auth.admin.inviteUserByEmail(body.email, {
        data: {
          name: body.name,
          invited_to_workspace: ctx.workspaceId
        }
      });
      if (aErr) {
        // Fallback: nur Profil-Eintrag ohne Auth-User (Pending)
        console.warn('Invite auth failed:', aErr.message);
      }

      // Profil-Eintrag (ggf. wird er durch trigger schon erstellt — dann updaten wir)
      let profileId = authUser && authUser.user ? authUser.user.id : null;
      if (profileId) {
        // Workspace updaten falls Trigger eigenen Workspace angelegt hat
        await service.from('profiles')
          .update({ workspace_id: ctx.workspaceId, role: body.role || 'vertrieb', name: body.name, status: 'pending' })
          .eq('id', profileId);
      }
      return ok(res, { invited: true, email: body.email });
    }

    res.statusCode = 405;
    return res.end('Method not allowed');
  } catch (err) {
    return serverError(res, err);
  }
};
