import * as store from '../store.js';
import { formatDate, todayIso } from '../dates.js';
import { MEALS, openEntryForm } from '../forms.js';
import { googleMapsUrl, googleRouteUrl } from '../links.js';
import { fetchWalkingRoute, formatWalk, getCachedRoute } from '../routing.js';
import { esc, externalLink, icon, toast } from '../ui.js';

const PALETTE = ['#0a84ff', '#ff375f', '#30d158', '#bf5af2', '#ff9f0a', '#64d2ff', '#a2845e', '#ff6482'];
const FOOD_ICON = '<svg viewBox="0 0 24 24"><path d="M7 2v20M4 2v6a3 3 0 0 0 6 0V2M17 22V2c-2 1-3 4-3 8h3"/></svg>';

let lastView = null;

function hasPosition(entry) {
    return typeof entry.lat === 'number' && typeof entry.lng === 'number';
}

function dayColor(trip, day) {
    return PALETTE[trip.days.indexOf(day) % PALETTE.length];
}

function popupHtml(entry, day, subtitle) {
    return `
        <div class="popup__title">${esc(entry.name)}</div>
        <div class="muted">${esc(subtitle)}</div>
        ${entry.note ? `<div style="margin-top:4px">${esc(entry.note)}</div>` : ''}
        <div class="popup__actions">
            ${externalLink(googleMapsUrl(entry), 'Google Maps', 'btn btn--primary')}
            ${externalLink(entry.url, 'Website')}
            <button class="btn" data-edit="${entry.id}" data-date="${day.date}">${icon('edit')} Bearbeiten</button>
        </div>`;
}

function defaultDate(trip) {
    const today = todayIso();
    return trip.days.some((day) => day.date === today) ? today : trip.days[0].date;
}

export function renderMap(container, route) {
    const trip = store.getActiveTrip();
    if (!trip || !trip.days.length) {
        container.classList.remove('view--map');
        container.innerHTML = '<p class="empty">Keine Reise ausgewählt.</p>';
        return null;
    }
    const selected = trip.days.some((day) => day.date === route.query.get('day')) ? route.query.get('day') : 'all';
    const focusId = route.query.get('focus');
    const visibleDays = selected === 'all' ? trip.days : trip.days.filter((day) => day.date === selected);
    const viewKey = `${trip.id}|${selected}`;

    container.innerHTML = `
        <div class="chips">
            <button class="chip ${selected === 'all' ? 'is-active' : ''}" data-day="all">Alle Tage</button>
            ${trip.days.map((day, i) => `
                <button class="chip ${selected === day.date ? 'is-active' : ''}" data-day="${day.date}">
                    ${i + 1}. ${esc(formatDate(day.date))}
                </button>`).join('')}
        </div>
        <div class="map-wrap">
            <div class="map" id="map"></div>
            <div class="map-top">
                ${selected === 'all'
                    ? `<a class="btn map-back" href="#/days">${icon('back')} Alle Tage</a>`
                    : `<a class="btn map-back" href="#/day/${selected}">${icon('back')} Tag ${trip.days.findIndex((day) => day.date === selected) + 1}</a>`}
                <div class="map-walk" data-walk hidden></div>
            </div>
            <div class="map-hint">Lange auf die Karte tippen, um einen Ort oder ein Restaurant hinzuzufügen.</div>
            <div class="map-controls">
                <button class="btn" data-route hidden>${icon('external')}</button>
                <button class="btn" data-locate aria-label="Mein Standort">${icon('locate')}</button>
            </div>
        </div>`;

    container.querySelectorAll('[data-day]').forEach((chip) => {
        chip.addEventListener('click', () => {
            location.hash = chip.dataset.day === 'all' ? '#/map' : `#/map?day=${chip.dataset.day}`;
        });
    });
    container.querySelector('.chip.is-active')?.scrollIntoView({ inline: 'center', block: 'nearest' });

    const map = L.map(container.querySelector('#map'), { zoomControl: false });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
    }).addTo(map);

    const bounds = [];
    let focusMarker = null;
    let disposed = false;
    const walkEl = container.querySelector('[data-walk]');

    const drawRoute = (points, color, showSummary) => {
        const straight = points.map(({ lat, lng }) => [lat, lng]);
        const cached = getCachedRoute(points);
        const fallback = cached
            ? null
            : L.polyline(straight, { color, weight: 3, opacity: 0.6, dashArray: '6 8' }).addTo(map);
        const applyRoute = (route) => {
            if (disposed || !route) {
                return;
            }
            fallback?.remove();
            L.polyline(route.coords, { color, weight: 5, opacity: 0.85 }).addTo(map);
            if (showSummary) {
                walkEl.textContent = `Fußweg: ${formatWalk(route)}`;
                walkEl.hidden = false;
            }
        };
        if (cached) {
            applyRoute(cached);
            return;
        }
        fetchWalkingRoute(points).then(applyRoute).catch(() => {
            if (!disposed && showSummary) {
                walkEl.textContent = 'Fußweg nicht verfügbar (offline) – gestrichelt: Luftlinie';
                walkEl.hidden = false;
            }
        });
    };

    for (const day of visibleDays) {
        const color = dayColor(trip, day);
        const dayLabel = `Tag ${trip.days.indexOf(day) + 1}, ${formatDate(day.date)}`;
        const places = day.entries.filter((entry) => entry.type === 'place');
        const routePoints = [];

        places.forEach((entry, i) => {
            if (!hasPosition(entry)) {
                return;
            }
            const marker = L.marker([entry.lat, entry.lng], {
                icon: L.divIcon({
                    className: '',
                    html: `<div class="marker-num" style="background:${color}">${i + 1}</div>`,
                    iconSize: [28, 28],
                    iconAnchor: [14, 14],
                    popupAnchor: [0, -14],
                }),
            }).addTo(map);
            marker.bindPopup(popupHtml(entry, day, `${dayLabel}${entry.time ? ` · ${entry.time} Uhr` : ''}`));
            routePoints.push(entry);
            bounds.push([entry.lat, entry.lng]);
            if (entry.id === focusId) {
                focusMarker = marker;
            }
        });

        if (routePoints.length > 1) {
            drawRoute(routePoints, color, selected !== 'all');
        }

        day.entries.filter((entry) => entry.type === 'restaurant' && hasPosition(entry)).forEach((entry) => {
            const marker = L.marker([entry.lat, entry.lng], {
                icon: L.divIcon({
                    className: '',
                    html: `<div class="marker-food">${FOOD_ICON}</div>`,
                    iconSize: [24, 24],
                    iconAnchor: [12, 12],
                    popupAnchor: [0, -12],
                }),
            }).addTo(map);
            marker.bindPopup(popupHtml(entry, day, `${dayLabel} · ${MEALS[entry.meal] ?? 'Essen'}`));
            bounds.push([entry.lat, entry.lng]);
            if (entry.id === focusId) {
                focusMarker = marker;
            }
        });
    }

    if (focusMarker) {
        map.setView(focusMarker.getLatLng(), 16);
        focusMarker.openPopup();
    } else if (lastView?.key === viewKey) {
        map.setView(lastView.center, lastView.zoom);
    } else if (bounds.length) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
    } else {
        map.setView([trip.lat ?? 48.1, trip.lng ?? 11.6], 12);
    }
    map.on('moveend', () => {
        lastView = { key: viewKey, center: map.getCenter(), zoom: map.getZoom() };
    });

    if (selected !== 'all') {
        const day = visibleDays[0];
        const routeUrl = googleRouteUrl(day.entries.filter((entry) => entry.type === 'place' && hasPosition(entry)));
        const routeButton = container.querySelector('[data-route]');
        if (routeUrl) {
            routeButton.hidden = false;
            routeButton.setAttribute('aria-label', 'Tagesroute in Google Maps');
            routeButton.title = 'Tagesroute in Google Maps';
            routeButton.addEventListener('click', () => window.open(routeUrl, '_blank', 'noopener'));
        }
    }

    map.on('contextmenu', (event) => {
        const lat = event.latlng.lat.toFixed(5);
        const lng = event.latlng.lng.toFixed(5);
        L.popup()
            .setLatLng(event.latlng)
            .setContent(`
                <div class="popup__title">Hier hinzufügen</div>
                <div class="popup__actions">
                    <button class="btn btn--primary" data-new="place" data-lat="${lat}" data-lng="${lng}">${icon('pin')} Ort</button>
                    <button class="btn" data-new="restaurant" data-lat="${lat}" data-lng="${lng}">${icon('food')} Restaurant</button>
                </div>`)
            .openOn(map);
    });

    map.on('popupopen', (event) => {
        const element = event.popup.getElement();
        element.querySelectorAll('[data-edit]').forEach((button) => {
            button.addEventListener('click', () => {
                const day = store.getDay(trip, button.dataset.date);
                const entry = day?.entries.find((candidate) => candidate.id === button.dataset.edit);
                if (entry) {
                    openEntryForm(trip, { type: entry.type, date: day.date, entry });
                }
            });
        });
        element.querySelectorAll('[data-new]').forEach((button) => {
            button.addEventListener('click', () => {
                map.closePopup();
                openEntryForm(trip, {
                    type: button.dataset.new,
                    date: selected === 'all' ? defaultDate(trip) : selected,
                    preset: { lat: button.dataset.lat, lng: button.dataset.lng },
                });
            });
        });
    });

    let locationMarker = null;
    container.querySelector('[data-locate]').addEventListener('click', () => map.locate({ setView: true, maxZoom: 16 }));
    map.on('locationfound', (event) => {
        locationMarker?.remove();
        locationMarker = L.circleMarker(event.latlng, { radius: 8, color: '#fff', weight: 3, fillColor: '#0a84ff', fillOpacity: 1 }).addTo(map);
    });
    map.on('locationerror', () => toast('Standort nicht verfügbar.'));

    requestAnimationFrame(() => map.invalidateSize());
    const hintTimer = setTimeout(() => container.querySelector('.map-hint')?.classList.add('is-hidden'), 6000);

    return () => {
        disposed = true;
        clearTimeout(hintTimer);
        map.remove();
    };
}
