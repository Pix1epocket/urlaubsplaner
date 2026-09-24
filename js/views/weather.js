import * as store from '../store.js';
import { daysUntil, formatDate } from '../dates.js';
import { openTripForm } from '../forms.js';
import { describeWeather, fetchForecast, getCachedForecast } from '../weather.js';
import { esc, toast } from '../ui.js';

const FORECAST_DAYS = 16;

function forecastRows(trip, forecast) {
    const tripDates = new Set(trip.days.map((day) => day.date));
    return forecast.days.map((day) => `
        <div class="card weather-row ${tripDates.has(day.date) ? 'weather-row--trip' : ''}">
            <div class="weather-row__date">${esc(formatDate(day.date))}</div>
            <div class="weather-row__desc">${esc(describeWeather(day.code))}<br><span class="muted">Regen ${day.rain ?? '–'} %</span></div>
            <div class="weather-row__temp">${day.max}°<br><span class="muted">${day.min}°</span></div>
        </div>`).join('');
}

function tripHint(trip) {
    const untilStart = daysUntil(trip.startDate);
    if (untilStart >= FORECAST_DAYS) {
        const available = untilStart - FORECAST_DAYS + 1;
        return `Die Vorhersage reicht 16 Tage voraus. Für deine Reisetage gibt es sie in etwa ${available} ${available === 1 ? 'Tag' : 'Tagen'}. Bis dahin siehst du das aktuelle Wetter vor Ort.`;
    }
    return 'Reisetage sind blau umrandet.';
}

export function renderWeather(container) {
    const trip = store.getActiveTrip();
    if (!trip) {
        container.innerHTML = '<p class="empty">Keine Reise ausgewählt.</p>';
        return;
    }
    if (typeof trip.lat !== 'number') {
        container.innerHTML = `
            <h2>Wetter</h2>
            <p class="empty">Für die Wettervorhersage braucht die Reise eine Position des Zielorts.</p>
            <button class="btn btn--block" data-edit-trip>Zielort festlegen</button>`;
        container.querySelector('[data-edit-trip]').addEventListener('click', () => openTripForm(trip));
        return;
    }

    let disposed = false;

    const draw = (forecast, status) => {
        if (disposed) {
            return;
        }
        container.innerHTML = `
            <h2>Wetter in ${esc(trip.destination || trip.name)}</h2>
            <p class="small muted">${esc(status)}</p>
            <p class="small">${esc(tripHint(trip))}</p>
            ${forecast ? forecastRows(trip, forecast) : ''}
            <button class="btn btn--block" data-refresh style="margin-top:12px">Aktualisieren</button>
            <p class="small muted" style="margin-top:12px">Daten: <a href="https://open-meteo.com" target="_blank" rel="noopener">Open-Meteo</a></p>`;
        container.querySelector('[data-refresh]').addEventListener('click', load);
    };

    const statusFor = (forecast) => {
        const time = new Date(forecast.fetchedAt).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' });
        return `Stand: ${time}`;
    };

    async function load() {
        const cached = getCachedForecast(trip);
        draw(cached, cached ? `${statusFor(cached)} · wird aktualisiert …` : 'Wird geladen …');
        try {
            const forecast = await fetchForecast(trip);
            draw(forecast, statusFor(forecast));
        } catch {
            draw(cached, cached ? `${statusFor(cached)} · offline, zeige letzten Stand` : 'Keine Verbindung – Wetter kann gerade nicht geladen werden.');
            if (!cached) {
                toast('Wetter braucht eine Internetverbindung.');
            }
        }
    }

    load();
    return () => {
        disposed = true;
    };
}
