import * as store from '../store.js';
import { formatRange, todayIso } from '../dates.js';
import { openTripForm } from '../forms.js';
import { THEMES, getTheme, setTheme } from '../theme.js';
import { esc, toast } from '../ui.js';

async function exportBackup() {
    const json = store.exportData();
    const fileName = `urlaubsplaner-backup-${todayIso()}.json`;
    const file = new File([json], fileName, { type: 'application/json' });
    const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;

    if (isTouchDevice && navigator.canShare?.({ files: [file] })) {
        try {
            await navigator.share({ files: [file], title: 'Urlaubsplaner-Backup' });
            return;
        } catch (error) {
            if (error.name === 'AbortError') {
                return;
            }
        }
    }
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Backup gespeichert');
}

function importBackup(file) {
    const reader = new FileReader();
    reader.onload = () => {
        if (!confirm('Alle aktuellen Daten werden durch das Backup ersetzt. Fortfahren?')) {
            return;
        }
        try {
            store.importData(reader.result);
            toast('Backup importiert');
        } catch (error) {
            alert(error instanceof SyntaxError ? 'Die Datei ist kein gültiges JSON.' : error.message);
        }
    };
    reader.readAsText(file);
}

export function renderSettings(container) {
    const trip = store.getActiveTrip();

    container.innerHTML = `
        <h2>Mehr</h2>

        <h3>Aktuelle Reise</h3>
        ${trip ? `
            <div class="card">
                <div class="card__title">${esc(trip.name)}</div>
                <div class="card__meta">${esc(trip.destination || 'Kein Zielort')} · ${esc(formatRange(trip.startDate, trip.endDate))}</div>
                <div class="card__actions"><button class="btn" data-edit-trip>Reise bearbeiten</button></div>
            </div>` : '<p class="empty">Keine Reise ausgewählt.</p>'}

        <h3>Darstellung</h3>
        <div class="card">
            <div class="segmented" role="radiogroup" aria-label="Darstellung">
                ${Object.entries(THEMES).map(([value, label]) => `
                    <button class="segmented__option ${getTheme() === value ? 'is-active' : ''}" role="radio" aria-checked="${getTheme() === value}" data-theme-option="${value}">
                        ${esc(value === 'auto' ? 'Automatisch' : label)}
                    </button>`).join('')}
            </div>
            <p class="field__hint">„Automatisch“ folgt der Einstellung des iPhones bzw. Macs.</p>
        </div>

        <h3>Backup</h3>
        <div class="card">
            <p class="small">Deine Daten liegen nur auf diesem Gerät. Exportiere regelmäßig ein Backup, z. B. in die Dateien-App oder iCloud Drive. Damit kannst du die Daten auch auf ein anderes Gerät übertragen.</p>
            <div class="card__actions">
                <button class="btn btn--primary" data-export>Backup exportieren</button>
                <label class="btn">Backup importieren<input type="file" accept="application/json,.json" data-import hidden></label>
            </div>
        </div>

        <h3>Daten</h3>
        <div class="card">
            <p class="small">Setzt alles auf die Beispielreisen Verona und Kreta zurück. Eigene Einträge gehen dabei verloren.</p>
            <div class="card__actions"><button class="btn btn--danger" data-reset>Auf Beispieldaten zurücksetzen</button></div>
        </div>

        <h3>Info</h3>
        <div class="card small">
            <p>Karten: © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>-Mitwirkende. Wetter: <a href="https://open-meteo.com" target="_blank" rel="noopener">Open-Meteo</a>. Ortssuche: Nominatim. Fußwege: <a href="https://routing.openstreetmap.de/about.html" target="_blank" rel="noopener">FOSSGIS-Routing (OSRM)</a>.</p>
            <p class="muted" data-storage-info></p>
        </div>`;

    container.querySelector('[data-edit-trip]')?.addEventListener('click', () => openTripForm(trip));
    container.querySelectorAll('[data-theme-option]').forEach((button) => {
        button.addEventListener('click', () => {
            setTheme(button.dataset.themeOption);
            container.querySelectorAll('[data-theme-option]').forEach((option) => {
                const isActive = option === button;
                option.classList.toggle('is-active', isActive);
                option.setAttribute('aria-checked', String(isActive));
            });
        });
    });
    container.querySelector('[data-export]').addEventListener('click', exportBackup);
    container.querySelector('[data-import]').addEventListener('change', (event) => {
        const [file] = event.target.files;
        if (file) {
            importBackup(file);
        }
        event.target.value = '';
    });
    container.querySelector('[data-reset]').addEventListener('click', () => {
        if (confirm('Wirklich alle Daten löschen und die Beispielreisen wiederherstellen?')) {
            store.resetToSamples();
            toast('Zurückgesetzt');
        }
    });

    navigator.storage?.persisted?.().then((persisted) => {
        const info = container.querySelector('[data-storage-info]');
        if (info) {
            info.textContent = persisted
                ? 'Speicher ist als dauerhaft markiert.'
                : 'Tipp: Zum Home-Bildschirm hinzufügen, damit iOS die Daten dauerhaft behält.';
        }
    });
}
