const PLACEHOLDER = 'Platzhalter – bitte echte Daten eintragen.';

function place(name, lat, lng, extra = {}) {
    return { type: 'place', name, lat, lng, ...extra };
}

function restaurant(name, meal, lat, lng, extra = {}) {
    return { type: 'restaurant', name, meal, lat, lng, ...extra };
}

function verona() {
    return {
        name: 'Verona',
        destination: 'Verona, Italien',
        lat: 45.4384,
        lng: 10.9916,
        startDate: '2026-10-08',
        endDate: '2026-10-11',
        days: {
            '2026-10-08': {
                title: 'Ankunft & Arena',
                entries: [
                    {
                        type: 'transport', mode: 'train', direction: 'outbound',
                        from: 'München Hbf', to: 'Verona Porta Nuova',
                        depTime: '08:00', arrTime: '13:30', note: PLACEHOLDER,
                    },
                    place('Piazza Bra', 45.4382, 10.9930, { time: '16:00' }),
                    place('Arena di Verona', 45.4390, 10.9945, { time: '17:00', url: 'https://www.arena.it/' }),
                    restaurant('Restaurant-Idee an der Piazza Bra', 'dinner', 45.4378, 10.9925, { note: 'Beispiel-Eintrag' }),
                ],
            },
            '2026-10-09': {
                title: 'Altstadt',
                entries: [
                    place('Casa di Giulietta', 45.4419, 10.9982, { time: '10:00' }),
                    place('Piazza delle Erbe', 45.4432, 10.9975, { time: '11:00' }),
                    place('Torre dei Lamberti', 45.4430, 10.9978, { time: '11:30' }),
                    place('Ponte Pietra', 45.4474, 11.0000, { time: '15:00' }),
                    place('Castel San Pietro', 45.4476, 11.0027, { time: '16:00', note: 'Aussicht zum Sonnenuntergang' }),
                    restaurant('Mittags-Option 1', 'lunch', 45.4436, 10.9968, { note: 'Beispiel-Eintrag' }),
                    restaurant('Mittags-Option 2', 'lunch', 45.4425, 10.9990, { note: 'Beispiel-Eintrag' }),
                ],
            },
            '2026-10-10': {
                title: 'Castelvecchio & San Zeno',
                entries: [
                    place('Castelvecchio', 45.4400, 10.9878, { time: '10:00' }),
                    place('Basilica di San Zeno', 45.4425, 10.9790, { time: '12:30' }),
                    { type: 'link', name: 'Arena di Verona – Tickets', url: 'https://www.arena.it/' },
                ],
            },
            '2026-10-11': {
                title: 'Abreise',
                entries: [
                    place('Giardino Giusti', 45.4424, 11.0036, { time: '10:00' }),
                    {
                        type: 'transport', mode: 'train', direction: 'return',
                        from: 'Verona Porta Nuova', to: 'München Hbf',
                        depTime: '14:30', arrTime: '20:00', note: PLACEHOLDER,
                    },
                ],
            },
        },
    };
}

function crete() {
    return {
        name: 'Kreta',
        destination: 'Heraklion, Kreta',
        lat: 35.3387,
        lng: 25.1442,
        startDate: '2026-10-20',
        endDate: '2026-10-27',
        days: {
            '2026-10-20': {
                title: 'Anreise',
                entries: [
                    {
                        type: 'transport', mode: 'flight', direction: 'outbound',
                        from: 'Heimatflughafen', to: 'Heraklion (HER)',
                        depTime: '07:00', arrTime: '11:30', note: PLACEHOLDER,
                    },
                    place('Heraklion Altstadt', 35.3387, 25.1330, { time: '16:00' }),
                ],
            },
            '2026-10-21': {
                title: 'Knossos',
                entries: [
                    place('Palast von Knossos', 35.2980, 25.1632, { time: '09:00', url: 'https://etickets.tap.gr/' }),
                    place('Archäologisches Museum Heraklion', 35.3389, 25.1368, { time: '14:00', url: 'https://etickets.tap.gr/' }),
                    { type: 'link', name: 'Online-Tickets (Kulturministerium)', url: 'https://etickets.tap.gr/' },
                ],
            },
            '2026-10-23': {
                title: 'Chania',
                entries: [place('Venezianischer Hafen Chania', 35.5176, 24.0180, { time: '11:00' })],
            },
            '2026-10-24': {
                title: 'Balos',
                entries: [place('Balos-Lagune', 35.5807, 23.5890)],
            },
            '2026-10-25': {
                title: 'Elafonisi',
                entries: [place('Elafonisi-Strand', 35.2715, 23.5413)],
            },
            '2026-10-27': {
                title: 'Abreise',
                entries: [
                    {
                        type: 'transport', mode: 'flight', direction: 'return',
                        from: 'Heraklion (HER)', to: 'Heimatflughafen',
                        depTime: '12:30', arrTime: '15:30', note: PLACEHOLDER,
                    },
                ],
            },
        },
    };
}

export function createSampleTrips() {
    return [verona(), crete()];
}
