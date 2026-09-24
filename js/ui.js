const sheet = document.getElementById('sheet');
const toastEl = document.getElementById('toast');
let toastTimer = null;

const ICONS = {
    plus: '<path d="M12 5v14M5 12h14"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    up: '<path d="M6 15l6-6 6 6"/>',
    down: '<path d="M6 9l6 6 6-6"/>',
    back: '<path d="M15 6l-6 6 6 6"/>',
    external: '<path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/>',
    map: '<path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4zM8 2v16M16 6v16"/>',
    pin: '<path d="M12 22s7-7 7-12a7 7 0 0 0-14 0c0 5 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',
    food: '<path d="M7 2v20M4 2v6a3 3 0 0 0 6 0V2M17 22V2c-2 1-3 4-3 8h3"/>',
    link: '<path d="M10 14a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1M14 10a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1"/>',
    locate: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="7"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
};

export function icon(name) {
    return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] ?? ''}</svg>`;
}

export function esc(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export function safeUrl(url) {
    return /^https?:\/\//i.test(url ?? '') ? url : '';
}

export function externalLink(url, label, className = 'btn') {
    const href = safeUrl(url);
    if (!href) {
        return '';
    }
    return `<a class="${className}" href="${esc(href)}" target="_blank" rel="noopener">${label} ${icon('external')}</a>`;
}

export function toast(message) {
    toastEl.textContent = message;
    toastEl.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-visible'), 2500);
}

function renderField(field, values) {
    if (field.type === 'row') {
        return `<div class="field-row">${field.fields.map((child) => renderField(child, values)).join('')}</div>`;
    }
    if (field.type === 'geo') {
        return renderGeoField(field, values);
    }
    const value = values[field.name] ?? field.default ?? '';
    const common = `name="${field.name}" id="f-${field.name}" ${field.required ? 'required' : ''} placeholder="${esc(field.placeholder ?? '')}"`;
    let control;
    if (field.type === 'textarea') {
        control = `<textarea ${common}>${esc(value)}</textarea>`;
    } else if (field.type === 'select') {
        const options = field.options
            .map(([optionValue, label]) => `<option value="${esc(optionValue)}" ${String(optionValue) === String(value) ? 'selected' : ''}>${esc(label)}</option>`)
            .join('');
        control = `<select ${common}>${options}</select>`;
    } else {
        control = `<input type="${field.type ?? 'text'}" value="${esc(value)}" ${common}>`;
    }
    const hint = field.hint ? `<p class="field__hint">${esc(field.hint)}</p>` : '';
    return `<label class="field"><span class="field__label">${esc(field.label)}</span>${control}${hint}</label>`;
}

function renderGeoField(field, values) {
    const lat = values.lat ?? '';
    const lng = values.lng ?? '';
    return `
        <div class="field">
            <span class="field__label">${esc(field.label ?? 'Position')}</span>
            <div class="field-row">
                <label class="field"><input name="lat" inputmode="decimal" placeholder="Breitengrad" value="${esc(lat)}"></label>
                <label class="field"><input name="lng" inputmode="decimal" placeholder="Längengrad" value="${esc(lng)}"></label>
            </div>
            <button type="button" class="btn" data-geo-search>${icon('search')} Position suchen</button>
            <div class="geo-results" data-geo-results></div>
            <p class="field__hint">Sucht nach dem Namen (braucht Internet). Alternativ auf der Karte lange tippen.</p>
        </div>`;
}

function parseNumber(value) {
    const normalized = String(value ?? '').trim().replace(',', '.');
    if (normalized === '') {
        return null;
    }
    const number = Number(normalized);
    return Number.isFinite(number) ? number : null;
}

function collectValues(form, fields) {
    const data = Object.fromEntries(new FormData(form).entries());
    for (const [key, value] of Object.entries(data)) {
        data[key] = typeof value === 'string' ? value.trim() : value;
    }
    if (findGeoField(fields)) {
        const pair = data.lat?.match(/^(-?\d+(?:\.\d+)?)\s*[,;]\s*(-?\d+(?:\.\d+)?)$/);
        if (pair && !data.lng) {
            [, data.lat, data.lng] = pair;
        }
        data.lat = parseNumber(data.lat);
        data.lng = parseNumber(data.lng);
        if (data.lat === null || data.lng === null) {
            data.lat = null;
            data.lng = null;
        }
    }
    return data;
}

async function searchPlaces(query) {
    const params = new URLSearchParams({ q: query, format: 'jsonv2', limit: '5', 'accept-language': 'de' });
    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`);
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }
    return response.json();
}

function bindGeoSearch(form, geoField) {
    const button = form.querySelector('[data-geo-search]');
    const results = form.querySelector('[data-geo-results]');
    if (!button) {
        return;
    }
    button.addEventListener('click', async () => {
        const name = form.elements[geoField.queryFrom ?? 'name']?.value.trim();
        if (!name) {
            toast('Bitte zuerst einen Namen eingeben.');
            return;
        }
        const query = geoField.context ? `${name}, ${geoField.context}` : name;
        results.innerHTML = '<p class="field__hint">Suche läuft …</p>';
        try {
            let hits = await searchPlaces(query);
            if (!hits.length && geoField.context) {
                hits = await searchPlaces(name);
            }
            if (!hits.length) {
                results.innerHTML = '<p class="field__hint">Nichts gefunden. Anderen Namen probieren oder auf der Karte lange tippen.</p>';
                return;
            }
            results.innerHTML = hits
                .map((hit, i) => `<button type="button" data-hit="${i}">${esc(hit.display_name)}</button>`)
                .join('');
            results.querySelectorAll('[data-hit]').forEach((hitButton) => {
                hitButton.addEventListener('click', () => {
                    const hit = hits[Number(hitButton.dataset.hit)];
                    form.elements.lat.value = Number(hit.lat).toFixed(5);
                    form.elements.lng.value = Number(hit.lon).toFixed(5);
                    results.innerHTML = '<p class="field__hint">Position übernommen.</p>';
                });
            });
        } catch {
            results.innerHTML = '<p class="field__hint">Suche nicht möglich – vermutlich keine Internetverbindung.</p>';
        }
    });
}

function findGeoField(fields) {
    for (const field of fields) {
        if (field.type === 'geo') {
            return field;
        }
        if (field.type === 'row') {
            const nested = findGeoField(field.fields);
            if (nested) {
                return nested;
            }
        }
    }
    return null;
}

export function closeSheet() {
    if (sheet.open) {
        sheet.close();
    }
}

export function openForm({ title, fields, values = {}, submitLabel = 'Speichern', onSubmit, onDelete, deleteLabel = 'Löschen' }) {
    sheet.innerHTML = `
        <div class="sheet__head">
            <button type="button" class="btn btn--ghost" data-close>Abbrechen</button>
            <h2>${esc(title)}</h2>
            <span style="width:72px"></span>
        </div>
        <form class="sheet__body" novalidate>
            ${fields.map((field) => renderField(field, values)).join('')}
            <div class="sheet__footer">
                <button type="submit" class="btn btn--primary btn--block">${esc(submitLabel)}</button>
                ${onDelete ? `<button type="button" class="btn btn--danger btn--block" data-delete>${esc(deleteLabel)}</button>` : ''}
            </div>
        </form>`;

    const form = sheet.querySelector('form');
    sheet.querySelector('[data-close]').addEventListener('click', closeSheet);
    const geoField = findGeoField(fields);
    if (geoField) {
        bindGeoSearch(form, geoField);
    }
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        const missing = [...form.querySelectorAll('[required]')].find((input) => !input.value.trim());
        if (missing) {
            missing.focus();
            toast('Bitte alle Pflichtfelder ausfüllen.');
            return;
        }
        const keepOpen = onSubmit(collectValues(form, fields)) === false;
        if (!keepOpen) {
            closeSheet();
        }
    });
    sheet.querySelector('[data-delete]')?.addEventListener('click', () => {
        if (onDelete() !== false) {
            closeSheet();
        }
    });
    sheet.showModal();
    sheet.scrollTop = 0;
}
