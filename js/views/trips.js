import * as store from '../store.js';
import { daysUntil, formatRange } from '../dates.js';
import { openTripForm } from '../forms.js';
import { esc, icon } from '../ui.js';

function countdown(trip) {
    const untilStart = daysUntil(trip.startDate);
    const untilEnd = daysUntil(trip.endDate);
    if (untilStart > 1) {
        return `noch ${untilStart} Tage`;
    }
    if (untilStart === 1) {
        return 'morgen geht’s los';
    }
    if (untilEnd >= 0) {
        return 'läuft gerade';
    }
    return 'vorbei';
}

export function renderTrips(container) {
    const trips = store.getTrips();
    const active = store.getActiveTrip();

    container.innerHTML = `
        <h2>Meine Reisen</h2>
        ${trips.length ? '' : '<p class="empty">Noch keine Reise angelegt.</p>'}
        ${trips.map((trip) => `
            <div class="card ${trip.id === active?.id ? 'card--active' : ''}">
                <div class="card__row">
                    <button class="card__button" data-select="${trip.id}">
                        <div class="card__title">${esc(trip.name)}</div>
                        <div class="card__meta">${esc(formatRange(trip.startDate, trip.endDate))} · ${trip.days.length} Tage</div>
                        <div class="countdown">${esc(countdown(trip))}</div>
                    </button>
                    <button class="btn btn--icon" data-edit="${trip.id}" aria-label="Reise bearbeiten">${icon('edit')}</button>
                </div>
            </div>`).join('')}
        <button class="btn btn--block" data-new>${icon('plus')} Neue Reise</button>`;

    container.querySelectorAll('[data-select]').forEach((button) => {
        button.addEventListener('click', () => {
            store.setActiveTrip(button.dataset.select);
            location.hash = '#/days';
        });
    });
    container.querySelectorAll('[data-edit]').forEach((button) => {
        button.addEventListener('click', () => openTripForm(store.getTrip(button.dataset.edit)));
    });
    container.querySelector('[data-new]').addEventListener('click', () => openTripForm());
}
