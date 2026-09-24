# Urlaubsplaner

Offlinefähige Web-App (PWA) für die Urlaubsplanung: Tagesprogramm, Karte mit Tagesrouten, Restaurant-Optionen, Links/Tickets, Verbindungen (Zug, Flug, Fähre) und Wetter. Reines HTML/CSS/JavaScript ohne Build-Schritt. Alle Daten liegen lokal im Browser des Geräts.

## Lokal testen (nur am Mac)

```bash
cd ~/"Cursor AI/urlaubsplaner"
python3 -m http.server --bind 127.0.0.1 8000
```

- Im Browser `http://localhost:8000` öffnen. Der Server ist nur vom Mac selbst erreichbar, nicht aus dem WLAN.
- iPhone-Ansicht einschalten:
  - Safari: Einstellungen → Erweitert → „Funktionen für Webentwickler anzeigen“, dann Menü „Entwickler“ → „Responsive Design Mode“.
  - Chrome: Entwicklertools (Cmd+Option+I) → Gerätesymbolleiste (Cmd+Shift+M) → iPhone-Modell wählen.
- Offline testen: Entwicklertools → Netzwerk → „Offline“.
- Server beenden: Ctrl+C.

Tipp: Wenn nach einer Code-Änderung noch die alte Version erscheint, die Seite einmal neu laden (die App lädt online immer zuerst die neueste Version).

## Auf das iPhone bringen (GitHub Pages, kostenlos)

1. Kostenlosen Account auf [github.com](https://github.com) anlegen.
2. Neues öffentliches Repository `urlaubsplaner` anlegen und dieses Projekt pushen:
   ```bash
   git remote add origin https://github.com/<benutzername>/urlaubsplaner.git
   git push -u origin main
   ```
3. Im Repository: Settings → Pages → „Deploy from a branch“ → Branch `main`, Ordner `/ (root)` → Save.
4. Nach ca. einer Minute ist die App unter `https://<benutzername>.github.io/urlaubsplaner/` erreichbar.
5. Auf dem iPhone in **Safari** öffnen → Teilen → „Zum Home-Bildschirm“.
6. Die App einmal online öffnen und die Karte am Urlaubsort ansehen. Danach funktionieren App und angesehene Kartenbereiche offline.

## Daten und Backup

- Die Daten liegen nur auf dem jeweiligen Gerät bzw. im jeweiligen Browser. Es gibt keine Synchronisierung.
- Unter „Mehr“ → „Backup exportieren“ entsteht eine JSON-Datei (z. B. in der Dateien-App oder iCloud Drive speichern). Mit „Backup importieren“ lassen sich die Daten auf einem anderen Gerät wiederherstellen, etwa vom Mac-Test aufs iPhone.
- Wird die App vom Home-Bildschirm gelöscht, sind auch ihre Daten weg.

## Grenzen

- Karte offline: nur Bereiche, die vorher schon einmal online angesehen wurden.
- Wetter und Ortssuche brauchen Internet. Der letzte Wetterstand bleibt offline sichtbar.
- Fußwege zwischen den Orten eines Tages werden online über den kostenlosen FOSSGIS-Routingdienst berechnet und danach gespeichert. Offline und für noch nie berechnete Routen zeigt die Karte gestrichelt die Luftlinie.
- Die Wettervorhersage reicht 16 Tage voraus.

## Struktur

- `index.html`, `manifest.webmanifest`, `sw.js` (Service Worker für den Offline-Betrieb)
- `css/app.css`
- `js/app.js` (Seitenwechsel), `js/store.js` (Daten), `js/forms.js`, `js/ui.js`, `js/links.js`, `js/routing.js` (Fußwege), `js/theme.js` (Hell/Dunkel), `js/weather.js`, `js/dates.js`, `js/sample-data.js`
- `js/views/` (Reisen, Tage, Karte, Wetter, Mehr)
- `vendor/leaflet/` (Kartenbibliothek, lokal für den Offline-Betrieb)
- `icons/` (App-Icons; neu erzeugen mit `python3 tools/make_icons.py`)

Nach Änderungen an der Dateiliste die Liste `APP_FILES` in `sw.js` anpassen und die Cache-Version (`APP_CACHE`) hochzählen.
