// /public/lib/df-api.js
// Client-Library für Dealfalcon-Frontend
// Wraps Supabase Auth + API-Calls
// Kein Build-Step nötig — läuft direkt im Browser

(function(global) {
  'use strict';

  // Supabase URL + Anon Key werden vom Server beim ersten Laden injected (siehe /public/config.js)
  // Fallback: leere Strings (dann zeigt sich ein klarer Fehler)
  var SUPABASE_URL = global.DF_SUPABASE_URL || '';
  var SUPABASE_ANON_KEY = global.DF_SUPABASE_ANON_KEY || '';

  // ============ TOKEN MANAGEMENT ============
  // Wir speichern Access + Refresh Token in localStorage (kompatibel mit Magic-Link-Flow)
  var TOKEN_KEY = 'df_supabase_session';

  function loadSession() {
    try { return JSON.parse(localStorage.getItem(TOKEN_KEY) || 'null'); } catch (e) { return null; }
  }

  function saveSession(session) {
    if (!session) localStorage.removeItem(TOKEN_KEY);
    else localStorage.setItem(TOKEN_KEY, JSON.stringify(session));
  }

  function getAccessToken() {
    var s = loadSession();
    if (!s) return null;
    // Token expired? (ggf. refresh)
    if (s.expires_at && s.expires_at * 1000 < Date.now() - 30000) {
      // Token bald abgelaufen, async refreshen
      return null;
    }
    return s.access_token;
  }

  // ============ AUTH ============

  async function sendMagicLink(email, opts) {
    if (!SUPABASE_URL) return { error: 'Supabase nicht konfiguriert' };
    var url = SUPABASE_URL + '/auth/v1/otp';
    var redirectTo = (opts && opts.redirectTo) || (location.origin + '/app/dashboard');
    var meta = (opts && opts.metadata) || {};
    var res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify({
        email: email,
        create_user: true,
        data: meta,
        options: { emailRedirectTo: redirectTo }
      })
    });
    if (!res.ok) {
      var errTxt = await res.text();
      return { error: errTxt || 'Magic-Link-Versand fehlgeschlagen' };
    }
    return { success: true };
  }

  // Wenn der User auf den Magic-Link klickt, kommt er mit #access_token=... in der URL zurück
  function processAuthRedirect() {
    if (!location.hash) return false;
    var params = new URLSearchParams(location.hash.slice(1));
    var accessToken = params.get('access_token');
    var refreshToken = params.get('refresh_token');
    var expiresIn = parseInt(params.get('expires_in') || '3600', 10);
    if (!accessToken) return false;
    saveSession({
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: Math.floor(Date.now() / 1000) + expiresIn,
      token_type: params.get('token_type') || 'bearer'
    });
    // Hash entfernen, damit URL sauber wird
    history.replaceState(null, '', location.pathname + location.search);
    return true;
  }

  async function getCurrentUser() {
    var token = getAccessToken();
    if (!token) return null;
    var res = await apiFetch('/api/auth/me');
    if (!res.ok) {
      // Token vielleicht abgelaufen — Session löschen
      if (res.status === 401) saveSession(null);
      return null;
    }
    var data = await res.json();
    return data;
  }

  function logout() {
    saveSession(null);
    location.href = '/';
  }

  // ============ API-FETCH WRAPPER ============

  async function apiFetch(path, opts) {
    opts = opts || {};
    var headers = Object.assign({}, opts.headers || {});
    var token = getAccessToken();
    if (token) headers['Authorization'] = 'Bearer ' + token;
    if (opts.body && typeof opts.body === 'object') {
      headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(opts.body);
    }
    return fetch(path, { method: opts.method || 'GET', headers: headers, body: opts.body });
  }

  async function apiJson(path, opts) {
    var res = await apiFetch(path, opts);
    var data = null;
    try { data = await res.json(); } catch (e) {}
    return { ok: res.ok, status: res.status, data: data };
  }

  // ============ HELPER: REQUIRE-AUTH ============

  async function requireAuth() {
    // Erst Magic-Link-Redirect verarbeiten falls vorhanden
    processAuthRedirect();
    var user = await getCurrentUser();
    if (!user) {
      location.href = '/login?next=' + encodeURIComponent(location.pathname + location.search);
      return null;
    }
    return user;
  }

  // ============ EXPOSE ============
  global.DfApi = {
    sendMagicLink: sendMagicLink,
    processAuthRedirect: processAuthRedirect,
    getCurrentUser: getCurrentUser,
    logout: logout,
    apiFetch: apiFetch,
    apiJson: apiJson,
    requireAuth: requireAuth,
    getAccessToken: getAccessToken,
    saveSession: saveSession
  };
})(window);
