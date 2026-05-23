# vorlesen.de

Kindgerechte Vorlesewebsite für Kinder von 3–6 Jahren mit KI-gestützten Features für Vorleser.

**Live:** [vorlesen.de](https://vorlesen.de)

---

## Konzept

Die Seite richtet sich an zwei Zielgruppen:

- **Kinder (3–6 Jahre):** Zugang zu 64 Kurzgeschichten in 9 Kategorien, jeweils mit Bild und MP3-Audiodatei
- **Vorleser (Eltern, Erzieher):** KI-gestützte Tools wie Vorlesetipps, Buchempfehlungen und ein Geschichtengenerator

---

## Tech-Stack

| Bereich | Technologie |
|---|---|
| Frontend | Reines HTML/CSS/JavaScript – kein Framework |
| Hosting | [Vercel](https://vercel.com) |
| API-Proxy | Vercel Serverless Function (`/api/claude.js`) |
| KI | Anthropic Claude API (`claude-3-5-haiku-20241022`) |
| Paketmanager | npm (nur für `@anthropic-ai/sdk` im Backend) |

---

## Projektstruktur

```
/
├── index.html          # Komplette App (3 Tabs, Navigation, alle JS-Logik)
├── style.css           # Alle Styles (inkl. Animationen, responsiv)
├── geschichten.js      # 64 Geschichtstexte als JS-Objekt (277 KB)
├── package.json        # Backend-Abhängigkeit: @anthropic-ai/sdk
├── .vercelignore       # node_modules von Deployment ausschließen
│
├── api/
│   └── claude.js       # Vercel Serverless Function – Proxy zur Anthropic API
│
├── images/             # 79 Bilder (Kategorien + Stories + UI)
│   ├── kat-*.jpg       # 8 Kategorie-Titelbilder
│   ├── *.jpg           # Story-Titelbilder (1 pro Geschichte)
│   └── *.jpg           # UI-Bilder (bert.jpg, vorlesetips.jpg, …)
│
└── audio/              # 64 MP3-Dateien (1 pro Geschichte)
    ├── abenteuer-1.mp3
    ├── weihnachten-8.mp3
    └── …
```

---

## Navigation (3-Ebenen-System im Kinder-Tab)

```
Ebene 1 – Kategorieübersicht (9 Kacheln)
    ↓ Klick auf Kategorie
Ebene 2 – Geschichtenliste (bis zu 8 Geschichten)
    ↓ Klick auf Geschichte
Ebene 3 – Leseansicht (Bild + Text + Audioplayer)
```

Ein Klick auf einen der oberen Tabs (Für Kinder / Für Vorleser / Für Alle) bringt immer zurück auf Ebene 1.

---

## KI-Features (Tab „Für Vorleser")

Alle drei Features rufen intern `/api/claude` auf (POST), der wiederum die Anthropic API aufruft. Der API-Key liegt **nur** auf Vercel als Umgebungsvariable – nie im Frontend-Code.

### Vorlesetipps
Statisch, kein API-Call. 8 redaktionelle Tipps mit Detailansicht.

### Buchempfehlung
- Nutzer gibt Alter und Interessen ein
- API-Call: `claude-3-5-haiku-20241022`, max. 400 Tokens
- Gibt 3 konkrete Buchempfehlungen mit Begründung zurück

### Geschichtengenerator
- Nutzer wählt Thema, Länge, Hauptfigur, Grobe Handlung
- Beispiel-Prompts als klickbare Chips hinterlegt
- API-Call: `claude-3-5-haiku-20241022`, max. 800 Tokens
- Gibt eine fertige Kurzgeschichte zurück

---

## API-Proxy (`/api/claude.js`)

Die Serverless Function ist ein schlanker Durchreicher:

```
Browser → POST /api/claude → Vercel Function → Anthropic API → Antwort zurück
```

Der Request-Body vom Frontend wird 1:1 an `client.messages.create()` weitergegeben. So kann das Frontend beliebige Modelle, Tokens und Prompts übergeben, ohne den API-Key zu kennen.

---

## Lokale Entwicklung

```bash
npm install -g vercel
npm install
vercel dev          # startet lokalen Dev-Server inkl. /api/ Endpunkte
```

Für die KI-Features wird ein `.env.local` mit folgendem Inhalt benötigt:

```
ANTHROPIC_API_KEY=sk-ant-...
```

---

## Deployment

Automatisch über Vercel bei Push auf `main`:

```bash
git push origin main
```

Oder manuell:

```bash
vercel --prod
```

---

## Umgebungsvariablen (Vercel)

| Variable | Beschreibung |
|---|---|
| `ANTHROPIC_API_KEY` | API-Key für die Anthropic Claude API |

Setzen via: `vercel env add ANTHROPIC_API_KEY`

---

## Kategorien & Inhalte

9 Kategorien mit je 8 Geschichten (= 64 gesamt):

`abenteuer` · `freundschaft` · `tiere` · `natur` · `fantasie` · `alltag` · `mut` · `humor` · `weihnachten`

Jede Geschichte hat:
- Einen Titel
- Ein Titelbild (`images/<name>.jpg`)
- Einen Text (in `geschichten.js`)
- Eine MP3-Datei (`audio/<kategorie>-<nr>.mp3`)
