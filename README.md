# Dealfalcon — Webseite & Live-Demo

Statische Marketing-Webseite plus interaktiver Prototyp für Vercel.

## Inhalt

- `public/index.html` — Marketing-Webseite (Startseite)
- `public/demo.html` — Interaktive Live-Demo (Vertriebs-Cockpit + Kunden-Microsite)
- `public/Angebot_2026-0428_PBT_AG.pdf` — Beispiel-PDF für Demo-Download
- `vercel.json` — Vercel-Konfiguration (Clean URLs, Security-Header)

## Routing

- `/` → Marketing-Webseite
- `/demo` → Live-Demo

## Deployment auf Vercel

### Variante A: Drag & Drop (schnellste Lösung)

1. Auf [vercel.com](https://vercel.com) einloggen
2. Auf **Add New → Project** klicken
3. Den **gesamten Ordner** (oder das ZIP entpacken und den Ordner) auf die Drop-Zone ziehen
4. Project-Name eingeben (z.B. `dealfalcon`)
5. **Deploy** klicken

Nach ca. 30 Sekunden ist die Seite live unter `https://dealfalcon-xyz.vercel.app`.

### Variante B: Vercel CLI

```bash
npm install -g vercel
cd dealfalcon-vercel
vercel
```

CLI fragt nach Projektname und startet das Deployment.

### Variante C: Über GitHub (empfohlen für laufende Updates)

1. Den Ordner als Git-Repo initialisieren und auf GitHub pushen
2. Auf Vercel: **Add New → Project → Import** und das Repo auswählen
3. **Deploy** klicken

Bei jedem Git-Push wird automatisch neu deployed.

## Eigene Domain

Nach dem ersten Deployment in Vercel unter **Settings → Domains** die eigene Domain (z.B. `dealfalcon.io`) hinzufügen. Vercel zeigt die DNS-Einträge, die beim Domain-Provider (z.B. united-domains, namecheap) hinterlegt werden müssen.

## Lokales Testen

Einfach `public/index.html` im Browser öffnen — keine Build-Schritte nötig.

Oder mit einem lokalen Server:

```bash
cd public
python3 -m http.server 8000
# → http://localhost:8000
```
