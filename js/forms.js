import * as store from './store.js';
import { formatDate, formatLongDate } from './dates.js';
import { openForm, toast } from './ui.js';

export const MEALS = { lunch: 'Mittag', dinner: 'Abend', other: 'Sonstiges' };
export const TRANSPORT_MODES = { train: 'Zug', flight: 'Flug', ferry: 'Fähre', bus: 'Bus', car: 'Auto' };
export const DIRECTIONS = { outbound: 'Anreise', return: 'Abreise', local: 'Unterwegs' };

const TYPE_TITLES = {
    place: 'Ort',
    restaurant: 'Restaurant',
    link: 'Link',
    transport: 'Verbindung',
};

function normalizeUrl(url) {
    if (!url) {
        return '';
    }
    return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function dayField(trip) {
    return {
        name: 'date',
        label: 'Tag',
        type: 'select',
        options: trip.days.map((day) => [day.date, `${formatDate(day.date)}${day.title ? ` – ${day.title}` : ''}`]),
    };
}

function entryFields(type, trip) {
    const geo = { type: 'geo', label: 'Position auf der Karte', context: trip.destination };
    const note = { name: 'note', label: 'Notiz', type: 'textarea' };
    switch (type) {
        case 'place':
            return [
                { name: 'name', label: 'Name', required: true, placeholder: 'z. B. Arena di Verona' },
                { type: 'row', fields: [{ name: 'time', label: 'Uhrzeit', type: 'time' }, dayField(trip)] },
                geo,
                { name: 'url', label: 'Website / Tickets', type: 'url', placeholder: 'https://…' },
                note,
            ];
        case 'restaurant':
            return [
                { name: 'name', label: 'Name', required: true },
                { type: 'row', fields: [{ name: 'meal', label: 'Mahlzeit', type: 'select', options: Object.entries(MEALS), default: 'lunch' }, dayField(trip)] },
                geo,
                { name: 'url', label: 'Website / Speisekarte', type: 'url', placeholder: 'https://…' },
                note,
            ];
        case 'link':
            return [
                { name: 'name', label: 'Titel', required: true, placeholder: 'z. B. Museumstickets' },
                { name: 'url', label: 'Adresse', type: 'url', required: true, placeholder: 'https://…' },
                dayField(trip),
                note,
            ];
        case 'transport':
            return [
                {
                    type: 'row',
                    fields: [
                        { name: 'mode', label: 'Verkehrsmittel', type: 'select', options: Object.entries(TRANSPORT_MODES), default: 'train' },
                        { name: 'direction', label: 'Art', type: 'select', options: Object.entries(DIRECTIONS), default: 'outbound' },
                    ],
                },
                { type: 'row', fields: [{ name: 'from', label: 'Von', required: true, placeholder: 'München Hbf' }, { name: 'to', label: 'Nach', required: true, placeholder: 'Verona Porta Nuova' }] },
                { type: 'row', fields: [{ name: 'depTime', label: 'Abfahrt', type: 'time' }, { name: 'arrTime', label: 'Ankunft', type: 'time' }] },
                dayField(trip),
                { type: 'row', fields: [{ name: 'number', label: 'Zug-/Flugnr.', placeholder: 'EC 85' }, { name: 'seat', label: 'Platz', placeholder: 'Wg. 7, Pl. 45' }] },
                { name: 'booking', label: 'Buchungscode' },
                { name: 'url', label: 'Ticket-Link', type: 'url', placeholder: 'https://…', hint: 'Tipp: In der DB-Navigator-App bei der Reise auf „Teilen“ tippen, Link kopieren und hier einfügen. Alternativ den Link aus der Buchungsbestätigung.' },
                note,
            ];
        default:
            return [];
    }
}

export function openEntryForm(trip, { type, date, entry = null, preset = {} }) {
    const values = { date, ...preset, ...(entry ?? {}) };
    openForm({
        title: `${TYPE_TITLES[type]} ${entry ? 'bearbeiten' : 'hinzufügen'}`,
        fields: entryFields(type, trip),
        values,
        onSubmit: (data) => {
            const { date: targetDate, ...rest } = data;
            rest.url = normalizeUrl(rest.url);
            if (type === 'transport') {
                rest.time = rest.depTime;
            }
            store.saveEntry(trip.id, targetDate || date, { ...rest, type, id: entry?.id });
            toast('Gespeichert');
        },
        onDelete: entry
            ? () => {
                if (!confirm('Eintrag wirklich löschen?')) {
                    return false;
                }
                store.deleteEntry(trip.id, entry.id);
                toast('Gelöscht');
                return true;
            }
            : null,
    });
}

export function openTripForm(trip = null) {
    openForm({
        title: trip ? 'Reise bearbeiten' : 'Neue Reise',
        values: trip ?? {},
        fields: [
            { name: 'name', label: 'Name der Reise', required: true, placeholder: 'z. B. Kreta' },
            { name: 'destination', label: 'Zielort', placeholder: 'z. B. Heraklion, Kreta', hint: 'Wird für Wetter und Kartenausschnitt verwendet.' },
            { type: 'geo', label: 'Position des Zielorts', queryFrom: 'destination' },
            { type: 'row', fields: [{ name: 'startDate', label: 'Von', type: 'date', required: true }, { name: 'endDate', label: 'Bis', type: 'date', required: true }] },
        ],
        submitLabel: trip ? 'Speichern' : 'Reise anlegen',
        onSubmit: (data) => {
            if (data.endDate < data.startDate) {
                toast('Das Enddatum liegt vor dem Startdatum.');
                return false;
            }
            if (trip) {
                const lost = store.countEntriesOutsideRange(trip.id, data.startDate, data.endDate);
                if (lost > 0 && !confirm(`${lost} Einträge liegen außerhalb des neuen Zeitraums und werden gelöscht. Fortfahren?`)) {
                    return false;
                }
            }
            store.saveTrip({ ...data, id: trip?.id });
            toast(trip ? 'Reise gespeichert' : 'Reise angelegt');
            return true;
        },
        onDelete: trip
            ? () => {
                if (!confirm(`Reise „${trip.name}“ mit allen Einträgen löschen?`)) {
                    return false;
                }
                store.deleteTrip(trip.id);
                toast('Reise gelöscht');
                location.hash = '#/trips';
                return true;
            }
            : null,
        deleteLabel: 'Reise löschen',
    });
}

export function openDayForm(trip, day) {
    openForm({
        title: formatLongDate(day.date),
        values: day,
        fields: [
            { name: 'title', label: 'Titel des Tages', placeholder: 'z. B. Altstadt' },
            { name: 'notes', label: 'Notizen', type: 'textarea' },
        ],
        onSubmit: (data) => {
            store.updateDay(trip.id, day.date, data);
        },
    });
}
