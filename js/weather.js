const CACHE_PREFIX = 'urlaubsplaner.weather.';

const WEATHER_CODES = {
    0: 'Klar',
    1: 'Überwiegend klar',
    2: 'Teilweise bewölkt',
    3: 'Bedeckt',
    45: 'Nebel',
    48: 'Nebel mit Reif',
    51: 'Leichter Nieselregen',
    53: 'Nieselregen',
    55: 'Starker Nieselregen',
    56: 'Gefrierender Nieselregen',
    57: 'Gefrierender Nieselregen',
    61: 'Leichter Regen',
    63: 'Regen',
    65: 'Starker Regen',
    66: 'Gefrierender Regen',
    67: 'Gefrierender Regen',
    71: 'Leichter Schneefall',
    73: 'Schneefall',
    75: 'Starker Schneefall',
    77: 'Schneegriesel',
    80: 'Leichte Regenschauer',
    81: 'Regenschauer',
    82: 'Heftige Regenschauer',
    85: 'Schneeschauer',
    86: 'Starke Schneeschauer',
    95: 'Gewitter',
    96: 'Gewitter mit Hagel',
    99: 'Schweres Gewitter mit Hagel',
};

export function describeWeather(code) {
    return WEATHER_CODES[code] ?? 'Unbekannt';
}

export function getCachedForecast(trip) {
    try {
        const cached = JSON.parse(localStorage.getItem(CACHE_PREFIX + trip.id));
        if (cached && cached.lat === trip.lat && cached.lng === trip.lng) {
            return cached;
        }
    } catch {
        // ignore broken cache entries
    }
    return null;
}

export function getCachedDay(trip, date) {
    return getCachedForecast(trip)?.days.find((day) => day.date === date) ?? null;
}

export async function fetchForecast(trip) {
    const params = new URLSearchParams({
        latitude: trip.lat,
        longitude: trip.lng,
        daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
        timezone: 'auto',
        forecast_days: '16',
    });
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }
    const { daily } = await response.json();
    const forecast = {
        lat: trip.lat,
        lng: trip.lng,
        fetchedAt: new Date().toISOString(),
        days: daily.time.map((date, i) => ({
            date,
            code: daily.weather_code[i],
            max: Math.round(daily.temperature_2m_max[i]),
            min: Math.round(daily.temperature_2m_min[i]),
            rain: daily.precipitation_probability_max[i],
        })),
    };
    localStorage.setItem(CACHE_PREFIX + trip.id, JSON.stringify(forecast));
    return forecast;
}
