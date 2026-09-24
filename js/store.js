import { datesBetween } from './dates.js';
import { createSampleTrips } from './sample-data.js';

const STORAGE_KEY = 'urlaubsplaner.v1';
const SCHEMA_VERSION = 1;

let state = null;
const listeners = new Set();

export function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function emptyDay(date) {
    return { date, title: '', notes: '', entries: [] };
}

function syncDays(trip) {
    const byDate = new Map(trip.days.map((day) => [day.date, day]));
    trip.days = datesBetween(trip.startDate, trip.endDate).map((date) => byDate.get(date) ?? emptyDay(date));
}

function buildSampleState() {
    const trips = createSampleTrips().map((sample) => {
        const trip = { ...sample, id: uid(), days: [] };
        syncDays(trip);
        for (const day of trip.days) {
            const preset = sample.days[day.date];
            if (preset) {
                day.title = preset.title ?? '';
                day.entries = preset.entries.map((entry) => ({ ...entry, id: uid() }));
            }
        }
        return trip;
    });
    return { version: SCHEMA_VERSION, activeTripId: trips[0].id, trips };
}

function isValidState(candidate) {
    return Boolean(candidate)
        && Array.isArray(candidate.trips)
        && candidate.trips.every((trip) => trip.id && trip.startDate && Array.isArray(trip.days));
}

function commit() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    listeners.forEach((listener) => listener(state));
}

export function init() {
    try {
        state = JSON.parse(localStorage.getItem(STORAGE_KEY));
    } catch {
        state = null;
    }
    if (!isValidState(state)) {
        state = buildSampleState();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
}

export function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export function getTrips() {
    return [...state.trips].sort((a, b) => a.startDate.localeCompare(b.startDate));
}

export function getTrip(id) {
    return state.trips.find((trip) => trip.id === id) ?? null;
}

export function getActiveTrip() {
    return getTrip(state.activeTripId) ?? state.trips[0] ?? null;
}

export function setActiveTrip(id) {
    state.activeTripId = id;
    commit();
}

export function countEntriesOutsideRange(tripId, startDate, endDate) {
    const trip = getTrip(tripId);
    if (!trip) {
        return 0;
    }
    const keep = new Set(datesBetween(startDate, endDate));
    return trip.days
        .filter((day) => !keep.has(day.date))
        .reduce((sum, day) => sum + day.entries.length, 0);
}

export function saveTrip(data) {
    const fields = {
        name: data.name,
        destination: data.destination,
        lat: data.lat,
        lng: data.lng,
        startDate: data.startDate,
        endDate: data.endDate,
    };
    let trip = data.id ? getTrip(data.id) : null;
    if (trip) {
        Object.assign(trip, fields);
    } else {
        trip = { id: uid(), ...fields, days: [] };
        state.trips.push(trip);
        state.activeTripId = trip.id;
    }
    syncDays(trip);
    commit();
    return trip;
}

export function deleteTrip(id) {
    state.trips = state.trips.filter((trip) => trip.id !== id);
    if (state.activeTripId === id) {
        state.activeTripId = state.trips[0]?.id ?? null;
    }
    commit();
}

export function getDay(trip, date) {
    return trip?.days.find((day) => day.date === date) ?? null;
}

export function updateDay(tripId, date, { title, notes }) {
    const day = getDay(getTrip(tripId), date);
    if (!day) {
        return;
    }
    day.title = title;
    day.notes = notes;
    commit();
}

function findEntry(trip, entryId) {
    for (const day of trip.days) {
        const index = day.entries.findIndex((entry) => entry.id === entryId);
        if (index !== -1) {
            return { day, index, entry: day.entries[index] };
        }
    }
    return null;
}

function insertByTime(entries, entry) {
    if (!entry.time) {
        entries.push(entry);
        return;
    }
    const next = entries.findIndex((other) => other.type === entry.type && other.time && other.time > entry.time);
    if (next === -1) {
        entries.push(entry);
    } else {
        entries.splice(next, 0, entry);
    }
}

export function saveEntry(tripId, date, data) {
    const trip = getTrip(tripId);
    const targetDay = getDay(trip, date);
    if (!targetDay) {
        return;
    }
    const existing = data.id ? findEntry(trip, data.id) : null;
    const entry = { ...(existing?.entry ?? {}), ...data, id: data.id ?? uid() };
    const keepPosition = existing
        && existing.day === targetDay
        && existing.entry.time === entry.time;

    if (keepPosition) {
        targetDay.entries[existing.index] = entry;
    } else {
        if (existing) {
            existing.day.entries.splice(existing.index, 1);
        }
        insertByTime(targetDay.entries, entry);
    }
    commit();
    return entry;
}

export function deleteEntry(tripId, entryId) {
    const found = findEntry(getTrip(tripId), entryId);
    if (!found) {
        return;
    }
    found.day.entries.splice(found.index, 1);
    commit();
}

export function moveEntry(tripId, entryId, direction) {
    const found = findEntry(getTrip(tripId), entryId);
    if (!found) {
        return;
    }
    const { day, index, entry } = found;
    const step = direction < 0 ? -1 : 1;
    let swapIndex = index + step;
    while (swapIndex >= 0 && swapIndex < day.entries.length && day.entries[swapIndex].type !== entry.type) {
        swapIndex += step;
    }
    if (swapIndex < 0 || swapIndex >= day.entries.length) {
        return;
    }
    [day.entries[index], day.entries[swapIndex]] = [day.entries[swapIndex], day.entries[index]];
    commit();
}

export function exportData() {
    return JSON.stringify({ ...state, exportedAt: new Date().toISOString() }, null, 2);
}

export function importData(text) {
    const candidate = JSON.parse(text);
    if (!isValidState(candidate)) {
        throw new Error('Die Datei enthält keine gültigen Urlaubsplaner-Daten.');
    }
    delete candidate.exportedAt;
    state = { ...candidate, version: SCHEMA_VERSION };
    commit();
}

export function resetToSamples() {
    state = buildSampleState();
    commit();
}
