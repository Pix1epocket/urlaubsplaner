import * as store from './store.js';
import { formatRange } from './dates.js';
import { renderTrips } from './views/trips.js';
import { renderDay, renderDays } from './views/days.js';
import { renderMap } from './views/map.js';
import { renderWeather } from './views/weather.js';
import { renderSettings } from './views/settings.js';

const ROUTES = {
    trips: { render: renderTrips, tab: 'trips' },
    days: { render: renderDays, tab: 'days' },
    day: { render: renderDay, tab: 'days' },
    map: { render: renderMap, tab: 'map' },
    weather: { render: renderWeather, tab: 'weather' },
    settings: { render: renderSettings, tab: 'settings' },
};

const viewEl = document.getElementById('view');
const titleEl = document.getElementById('header-title');
const subtitleEl = document.getElementById('header-subtitle');
let cleanup = null;
let currentName = null;

function parseHash() {
    const [path, query = ''] = location.hash.replace(/^#\/?/, '').split('?');
    const [name, ...params] = path.split('/');
    return { name: ROUTES[name] ? name : 'trips', params, query: new URLSearchParams(query) };
}

function updateHeader(routeName) {
    const trip = store.getActiveTrip();
    if (routeName === 'trips' || !trip) {
        titleEl.textContent = 'Urlaubsplaner';
        subtitleEl.textContent = trip ? `Aktiv: ${trip.name}` : '';
        return;
    }
    titleEl.textContent = trip.name;
    subtitleEl.textContent = formatRange(trip.startDate, trip.endDate);
}

function render() {
    const scrollY = window.scrollY;
    const route = parseHash();
    const isSameView = currentName === `${route.name}/${route.params.join('/')}`;

    cleanup?.();
    cleanup = null;
    viewEl.className = `view view--${route.name}`;
    viewEl.innerHTML = '';
    cleanup = ROUTES[route.name].render(viewEl, route) ?? null;

    document.querySelectorAll('.tabbar a').forEach((tab) => {
        tab.classList.toggle('is-active', tab.dataset.tab === ROUTES[route.name].tab);
    });
    updateHeader(route.name);
    window.scrollTo(0, isSameView ? scrollY : 0);
    currentName = `${route.name}/${route.params.join('/')}`;
}

store.init();
store.subscribe(render);
window.addEventListener('hashchange', render);
render();

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch((error) => console.warn('Service Worker nicht registriert:', error));
    });
}

if (window.matchMedia('(display-mode: standalone)').matches || navigator.standalone) {
    navigator.storage?.persist?.();
}
