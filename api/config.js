// /api/config.js
// Liefert öffentliche Konfiguration (Supabase URL + Anon Key) ans Frontend
// Anon-Key ist explizit als "public" gedacht und sicher im Browser

module.exports = (req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300'); // 5 Min Cache
  var body = 'window.DF_SUPABASE_URL = ' + JSON.stringify(process.env.SUPABASE_URL || '') + ';\n' +
             'window.DF_SUPABASE_ANON_KEY = ' + JSON.stringify(process.env.SUPABASE_ANON_KEY || '') + ';\n';
  res.end(body);
};
