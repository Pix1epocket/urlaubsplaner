const DAY_MS = 24 * 60 * 60 * 1000;

function parseIso(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
}

function toIso(ms) {
    return new Date(ms).toISOString().slice(0, 10);
}

export function todayIso() {
    const now = new Date();
    return toIso(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

export function datesBetween(start, end) {
    if (!start || !end || start > end) {
        return start ? [start] : [];
    }
    const dates = [];
    for (let ms = parseIso(start); ms <= parseIso(end); ms += DAY_MS) {
        dates.push(toIso(ms));
    }
    return dates;
}

export function daysUntil(iso) {
    return Math.round((parseIso(iso) - parseIso(todayIso())) / DAY_MS);
}

export function formatDate(iso, options = { weekday: 'short', day: '2-digit', month: '2-digit' }) {
    return new Date(parseIso(iso)).toLocaleDateString('de-DE', { timeZone: 'UTC', ...options });
}

export function formatLongDate(iso) {
    return formatDate(iso, { weekday: 'long', day: 'numeric', month: 'long' });
}

export function formatRange(start, end) {
    const opts = { day: '2-digit', month: '2-digit', year: 'numeric' };
    return `${formatDate(start, opts)} – ${formatDate(end, opts)}`;
}
