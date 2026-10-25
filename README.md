# vorlesen.de

Kindgerechte Vorlesewebsite mit KI-Geschichtengenerator. Kinder hören sich Geschichten an, Vorleser können per Handy eigene Geschichten einsprechen und von der KI ausformulieren lassen.

**Live:** [vorlesen.de](https://vorlesen.de) · [zaubern.vorlesen.de](https://zaubern.vorlesen.de)

---

## Was die Seite kann

**Für Kinder**
- 64 Kurzgeschichten in 8 Kategorien (Tiere, Abenteuer, Einschlafen, Lustig, Lernen, Weihnachten, Mut, Freundschaft)
- Jede Geschichte mit Bild und MP3-Audiodatei
- Nutzergenerierte Geschichten erscheinen automatisch in der Kategorie „Neu"

**Für Vorleser**
- KI-Vorlesetipps und Buchempfehlungen (Claude API)
- Eigene Geschichte eintippen oder per Handy einsprechen → KI schreibt die vollständige Geschichte und generiert eine Bleistiftzeichnung-Illustration (DALL-E 3)

**Subdomain zaubern.vorlesen.de**
- Optimiert fürs Handy, PWA-fähig (Home-Screen-Icon)
- 3-Screen-Flow: Idee eingeben → KI-Vorschlag prüfen → fertige Geschichte lesen

---

## Tech-Stack

| Bereich | Technologie |
|---|---|
| Frontend | Reines HTML/CSS/JavaScript – kein Framework |
| Hosting | Vercel (Auto-Deploy aus `main`) |
| Story-Speicher | Upstash Redis (REST API) |
| KI Text | Anthropic Claude (`claude-sonnet-4-5`) |
| KI Bild | OpenAI DALL-E 3 |
| Spracherkennung | Web Speech API (Browser-nativ, kein Server) |

---

## Projektstruktur

```
/
├── index.html            # Hauptseite (Kinder-Tab, Vorleser-Tab, Navigation)
├── style.css             # Alle Styles für index.html
├── story-creator.html    # Geschichtengenerator (zaubern.vorlesen.de)
├── admin.html            # Admin-Oberfläche (Geschichten verwalten, löschen)
├── geschichten.js        # 64 eingebaute Geschichtstexte als JS-Objekt
├── vercel.json           # Routing, Redirects, cleanUrls
├── zaubern.webmanifest   # PWA-Manifest für zaubern.vorlesen.de
├── apple-touch-icon.png  # Home-Screen-Icon (180×180 px)
│
├── api/
│   ├── claude.js         # Proxy zur Anthropic API (für Vorlesetipps, Buchempfehlung)
│   ├── story-suggest.js  # Schlägt Titel + Kategorie für eine Idee vor
│   ├── story-save.js     # Generiert Geschichte (Claude) + Bild (DALL-E) und speichert in Redis
│   ├── stories.js        # Gibt alle User-Geschichten aus Redis zurück
│   ├── story-admin.js    # Admin-API: Geschichten auflisten, bearbeiten, löschen
│   └── counter.js        # Besucher-Zähler (täglich + gesamt via Redis)
│
├── images/               # Kategorie- und Storybiler
└── audio/                # MP3-Dateien (64 eingebaute Geschichten)
```

---

## Geschichtengenerator-Flow (story-creator.html)

```
Screen 1 – Idee eingeben
  Text tippen oder per Mikrofon einsprechen (Web Speech API → Transkription)
    ↓ "KI-Vorschlag" klicken
Screen 2 – KI-Vorschlag
  Claude schlägt Titel und Kategorie vor → User kann anpassen, Autorname eintragen
    ↓ "Geschichte jetzt generieren" klicken
Screen 3 – Fertig
  Claude schreibt die Geschichte, DALL-E 3 generiert eine Bleistiftzeichnung
  Beide Requests laufen parallel → kaum Mehrzeit
  Link springt direkt zur neuen Geschichte auf vorlesen.de
```

---

## API-Endpunkte

### `POST /api/story-suggest`
Schlägt Titel und Kategorie für eine Idee vor.
```json
// Request
{ "idee": "Ein Drache, der Angst vor Feuer hat" }

// Response
{ "titel": "Feuerscheu – der ängstliche Drache", "kategorie": "Abenteuer" }
```

### `POST /api/story-save`
Generiert Geschichte + Illustration und speichert beides in Redis.
```json
// Request
{ "titel": "...", "kategorie": "...", "idee": "...", "autor": "Anna" }

// Response
{ "id": "1700000000000", "titel": "...", "text": "...", "imageUrl": "https://..." }
```

### `GET /api/stories`
Gibt alle User-Geschichten zurück (neueste zuerst).

### `GET /api/story-admin?pw=PASSWORT`
Gibt alle Geschichten zurück (nur mit Admin-Kennwort).

### `POST /api/story-admin`
Bearbeitet oder löscht eine Geschichte.
```json
{ "pw": "...", "action": "delete"|"update", "id": "...", "titel": "..." }
```

---

## Lokale Entwicklung

```bash
npm install
vercel dev    # startet lokalen Dev-Server inkl. /api/ Endpunkte auf Port 3000
```

`.env.local` für lokale API-Calls:
```
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
ADMIN_PASSWORD=...
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

---

## Deployment

Push auf `main` deployt automatisch auf Vercel:
```bash
git push origin main
```

---

## Umgebungsvariablen (Vercel)

| Variable | Wofür |
|---|---|
| `ANTHROPIC_API_KEY` | Claude (Texte, Vorschläge, Vorlesetipps) |
| `OPENAI_API_KEY` | DALL-E 3 (Illustrationen) |
| `ADMIN_PASSWORD` | Zugang zu admin.html |
| `UPSTASH_REDIS_REST_URL` | User-Geschichten speichern/abrufen |
| `UPSTASH_REDIS_REST_TOKEN` | Authentifizierung bei Upstash |

---

## Story-Datenmodell (Redis)

Geschichten werden als JSON-Strings in einer Redis-Liste (`user_stories`) gespeichert, neueste zuerst (LPUSH).

```json
{
  "id": "1700000000000",
  "titel": "Der mutige Fuchs",
  "kategorie": "Mut",
  "idee": "Ein Fuchs überwindet seine Angst vor dem dunklen Wald",
  "autor": "Anna",
  "text": "Es war einmal...",
  "imageUrl": "https://oaidalleapiprodscus.blob.core.windows.net/...",
  "created": "2026-10-25T10:00:00.000Z"
}
```

---

## Deep-Link

`vorlesen.de/?story=TITEL` öffnet die Geschichte direkt. Wird vom Geschichtengenerator auf Screen 3 automatisch gesetzt.
