import * as store from '../store.js';
import { formatDate, formatLongDate, todayIso } from '../dates.js';
import { DIRECTIONS, MEALS, TRANSPORT_MODES, openDayForm, openEntryForm } from '../forms.js';
import { BAHN_SEARCH_URL, googleMapsUrl, googleRouteUrl } from '../links.js';
import { fetchWalkingRoute, formatWalk, getCachedRoute } from '../routing.js';
import { describeWeather, getCachedDay } from '../weather.js';
import { esc, externalLink, icon } from '../ui.js';

function hasPosition(entry) {
    return typeof entry.lat === 'number' && typeof entry.lng === 'number';
}

function byType(day, type) {
    return day.entries.filter((entry) => entry.type === type);
}

function count(entries, singular, plural) {
    if (!entries.length) {
        return '';
    }
    return `${entries.length} ${entries.length === 1 ? singular : plural}`;
}

function weatherLine(trip, date) {
    const weather = getCachedDay(trip, date);
    if (!weather) {
        return '';
    }
    return `<div class="day-weather">${esc(describeWeather(weather.code))} · ${weather.max}° / ${weather.min}° · Regen ${weather.rain ?? '–'} %</div>`;
}

function noTripMessage() {
    return '<p class="empty">Keine Reise ausgewählt. Lege unter „Reisen“ eine an.</p>';
}

export function renderDays(container) {
    const trip = store.getActiveTrip();
    if (!trip) {
        container.innerHTML = noTripMessage();
        return;
    }
    const today = todayIso();

    container.innerHTML = trip.days.map((day, i) => {
        const transports = byType(day, 'transport');
        const summary = [
            ...transports.map((t) => `${DIRECTIONS[t.direction] ?? 'Verbindung'} ${TRANSPORT_MODES[t.mode] ?? ''} ${t.depTime ?? ''}`.trim()),
            count(byType(day, 'place'), 'Ort', 'Orte'),
            count(byType(day, 'restaurant'), 'Restaurant', 'Restaurants'),
            count(byType(day, 'link'), 'Link', 'Links'),
        ].filter(Boolean).join(' · ');
        return `
            <a class="card card--link ${day.date === today ? 'card--active' : ''}" href="#/day/${day.date}">
                <div class="card__row">
                    <div class="num ${day.entries.length ? '' : 'num--muted'}">${i + 1}</div>
                    <div class="card__main">
                        <div class="card__meta">${esc(formatLongDate(day.date))}${day.date === today ? ' · heute' : ''}</div>
                        <div class="card__title">${esc(day.title || 'Noch nichts geplant')}</div>
                        ${summary ? `<div class="card__meta">${esc(summary)}</div>` : ''}
                        ${weatherLine(trip, day.date)}
                    </div>
                </div>
            </a>`;
    }).join('');
}

function moveButtons(entry) {
    return `
        <button class="btn btn--icon" data-move="-1" data-id="${entry.id}" aria-label="Nach oben">${icon('up')}</button>
        <button class="btn btn--icon" data-move="1" data-id="${entry.id}" aria-label="Nach unten">${icon('down')}</button>`;
}

function mapButtons(entry, day) {
    if (!hasPosition(entry)) {
        return '';
    }
    return `
        <a class="btn" href="#/map?day=${day.date}&focus=${entry.id}">${icon('map')} Karte</a>
        ${externalLink(googleMapsUrl(entry), 'Google Maps')}`;
}

function transportCard(entry, day) {
    const isHighlight = entry.direction === 'outbound' || entry.direction === 'return';
    const details = [
        entry.number ? `Nr. ${esc(entry.number)}` : '',
        entry.seat ? `Platz ${esc(entry.seat)}` : '',
        entry.booking ? `Buchung ${esc(entry.booking)}` : '',
    ].filter(Boolean).join(' · ');
    return `
        <div class="card entry--transport ${isHighlight ? 'entry--highlight' : ''}">
            <div class="card__row">
                <div class="card__main">
                    <span class="badge badge--transport">${esc(DIRECTIONS[entry.direction] ?? 'Verbindung')} · ${esc(TRANSPORT_MODES[entry.mode] ?? '')}</span>
                    <div class="card__title" style="margin-top:6px">${esc(entry.depTime || '--:--')} ${esc(entry.from)}</div>
                    <div class="card__title">${esc(entry.arrTime || '--:--')} ${esc(entry.to)}</div>
                    ${details ? `<div class="card__meta">${details}</div>` : ''}
                    ${entry.note ? `<div class="card__note">${esc(entry.note)}</div>` : ''}
                </div>
                <button class="btn btn--icon" data-edit="${entry.id}" aria-label="Bearbeiten">${icon('edit')}</button>
            </div>
            <div class="card__actions">
                ${externalLink(entry.url, 'Ticket öffnen', 'btn btn--primary')}
                ${entry.mode === 'train' && !entry.url ? externalLink(BAHN_SEARCH_URL, 'DB-Fahrplan') : ''}
            </div>
        </div>`;
}

function placeCard(entry, index, day) {
    return `
        <div class="card">
            <div class="card__row">
                <div class="num ${hasPosition(entry) ? '' : 'num--muted'}">${index + 1}</div>
                <div class="card__main">
                    <div class="card__title">${esc(entry.name)}</div>
                    ${entry.time ? `<div class="card__meta">${esc(entry.time)} Uhr</div>` : ''}
                    ${entry.note ? `<div class="card__note">${esc(entry.note)}</div>` : ''}
                </div>
                ${moveButtons(entry)}
                <button class="btn btn--icon" data-edit="${entry.id}" aria-label="Bearbeiten">${icon('edit')}</button>
            </div>
            <div class="card__actions">
                ${externalLink(entry.url, 'Website / Tickets', 'btn btn--primary')}
                ${mapButtons(entry, day)}
            </div>
        </div>`;
}

function restaurantCard(entry, day) {
    return `
        <div class="card entry--restaurant">
            <div class="card__row">
                <div class="card__main">
                    <span class="badge badge--food">${esc(MEALS[entry.meal] ?? 'Essen')}</span>
                    <div class="card__title" style="margin-top:6px">${esc(entry.name)}</div>
                    ${entry.note ? `<div class="card__note">${esc(entry.note)}</div>` : ''}
                </div>
                ${moveButtons(entry)}
                <button class="btn btn--icon" data-edit="${entry.id}" aria-label="Bearbeiten">${icon('edit')}</button>
            </div>
            <div class="card__actions">
                ${externalLink(entry.url, 'Website', 'btn btn--primary')}
                ${mapButtons(entry, day)}
            </div>
        </div>`;
}

function linkCard(entry) {
    return `
        <div class="card">
            <div class="card__row">
                <div class="card__main">
                    <div class="card__title">${esc(entry.name)}</div>
                    ${entry.note ? `<div class="card__note">${esc(entry.note)}</div>` : ''}
                </div>
                ${moveButtons(entry)}
                <button class="btn btn--icon" data-edit="${entry.id}" aria-label="Bearbeiten">${icon('edit')}</button>
            </div>
            <div class="card__actions">${externalLink(entry.url, 'Öffnen', 'btn btn--primary')}</div>
        </div>`;
}

function section(title, type, content, emptyText) {
    return `
        <div class="section-head">
            <h3>${title}</h3>
            <button class="btn btn--ghost" data-add="${type}">${icon('plus')} Hinzufügen</button>
        </div>
        ${content || `<p class="empty">${emptyText}</p>`}`;
}

export function renderDay(container, route) {
    const trip = store.getActiveTrip();
    const date = route.params[0];
    const day = store.getDay(trip, date);
    if (!day) {
        container.innerHTML = trip ? '<p class="empty">Diesen Tag gibt es in der Reise nicht.</p>' : noTripMessage();
        return;
    }
    const index = trip.days.indexOf(day);
    const prev = trip.days[index - 1];
    const next = trip.days[index + 1];

    const transports = byType(day, 'transport');
    const places = byType(day, 'place');
    const restaurants = byType(day, 'restaurant');
    const links = byType(day, 'link');
    const routeUrl = googleRouteUrl(places.filter(hasPosition));

    container.innerHTML = `
        <div class="section-head">
            <a class="btn btn--ghost" href="#/days">${icon('back')} Alle Tage</a>
            <span style="margin-left:auto"></span>
            ${prev ? `<a class="btn btn--icon" href="#/day/${prev.date}" aria-label="Vorheriger Tag">${icon('back')}</a>` : ''}
            ${next ? `<a class="btn btn--icon" href="#/day/${next.date}" aria-label="Nächster Tag" style="transform:scaleX(-1)">${icon('back')}</a>` : ''}
        </div>

        <div class="card">
            <div class="card__row">
                <div class="card__main">
                    <div class="card__meta">Tag ${index + 1} · ${esc(formatLongDate(day.date))}</div>
                    <h2 style="margin:2px 0">${esc(day.title || 'Noch ohne Titel')}</h2>
                    ${weatherLine(trip, day.date)}
                    ${day.notes ? `<div class="card__note">${esc(day.notes)}</div>` : ''}
                </div>
                <button class="btn btn--icon" data-edit-day aria-label="Tag bearbeiten">${icon('edit')}</button>
            </div>
        </div>

        ${section('Verbindungen', 'transport', transports.map((entry) => transportCard(entry, day)).join(''), 'Keine Verbindung an diesem Tag.')}

        ${section('Programm', 'place', programHtml(places, day), 'Noch keine Orte geplant.')}
        ${routeUrl ? `<p class="leg leg--total" data-walk-total></p>
        <div class="card__actions" style="margin-top:0">
            <a class="btn" href="#/map?day=${day.date}">${icon('map')} Tagesroute auf der Karte</a>
            ${externalLink(routeUrl, 'Route in Google Maps')}
        </div>` : ''}

        ${section('Essen – Optionen', 'restaurant', restaurants.map((entry) => restaurantCard(entry, day)).join(''), 'Noch keine Restaurants vorgemerkt.')}

        ${section('Links & Tickets', 'link', links.map((entry) => linkCard(entry)).join(''), 'Noch keine Links.')}

        <p class="small muted" style="margin-top:24px">Tag ${index + 1} von ${trip.days.length} · ${esc(formatDate(trip.days[0].date))} bis ${esc(formatDate(trip.days[trip.days.length - 1].date))}</p>`;

    container.querySelector('[data-edit-day]').addEventListener('click', () => openDayForm(trip, day));
    container.querySelectorAll('[data-add]').forEach((button) => {
        button.addEventListener('click', () => openEntryForm(trip, { type: button.dataset.add, date: day.date }));
    });
    container.querySelectorAll('[data-edit]').forEach((button) => {
        const entry = day.entries.find((candidate) => candidate.id === button.dataset.edit);
        button.addEventListener('click', () => openEntryForm(trip, { type: entry.type, date: day.date, entry }));
    });
    container.querySelectorAll('[data-move]').forEach((button) => {
        button.addEventListener('click', () => store.moveEntry(trip.id, button.dataset.id, Number(button.dataset.move)));
    });

    return showWalkingLegs(container, places.filter(hasPosition));
}

function programHtml(places, day) {
    const geoCount = places.filter(hasPosition).length;
    let geoIndex = 0;
    return places.map((entry, i) => {
        let leg = '';
        if (hasPosition(entry)) {
            geoIndex += 1;
            if (geoIndex < geoCount) {
                leg = `<p class="leg" data-leg="${geoIndex - 1}"></p>`;
            }
        }
        return placeCard(entry, i, day) + leg;
    }).join('');
}

function showWalkingLegs(container, points) {
    if (points.length < 2) {
        return null;
    }
    let disposed = false;
    const fill = (route) => {
        if (disposed || !route) {
            return;
        }
        container.querySelectorAll('[data-leg]').forEach((el) => {
            const leg = route.legs[Number(el.dataset.leg)];
            el.textContent = leg ? formatWalk(leg) : '';
        });
        const total = container.querySelector('[data-walk-total]');
        if (total) {
            total.textContent = `Tagesroute gesamt: ${formatWalk(route)}`;
        }
    };
    const cached = getCachedRoute(points);
    if (cached) {
        fill(cached);
    } else {
        fetchWalkingRoute(points).then(fill).catch(() => {});
    }
    return () => {
        disposed = true;
    };
}
