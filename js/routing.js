const CACHE_PREFIX = 'urlaubsplaner.route.';
const ROUTING_URL = 'https://routing.openstreetmap.de/routed-foot/route/v1/foot/';
const pending = new Map();

function routeKey(points) {
    return points.map(({ lat, lng }) => `${lng.toFixed(5)},${lat.toFixed(5)}`).join(';');
}

export function getCachedRoute(points) {
    if (points.length < 2) {
        return null;
    }
    try {
        return JSON.parse(localStorage.getItem(CACHE_PREFIX + routeKey(points)));
    } catch {
        return null;
    }
}

export function fetchWalkingRoute(points) {
    if (points.length < 2) {
        return Promise.resolve(null);
    }
    const key = routeKey(points);
    const cached = getCachedRoute(points);
    if (cached) {
        return Promise.resolve(cached);
    }
    if (!pending.has(key)) {
        const request = fetch(`${ROUTING_URL}${key}?overview=full&geometries=geojson&steps=false`)
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                return response.json();
            })
            .then((data) => {
                const [route] = data.routes ?? [];
                if (data.code !== 'Ok' || !route) {
                    throw new Error(data.code ?? 'Keine Route');
                }
                const result = {
                    coords: route.geometry.coordinates.map(([lng, lat]) => [Number(lat.toFixed(5)), Number(lng.toFixed(5))]),
                    distance: route.distance,
                    duration: route.duration,
                    legs: route.legs.map((leg) => ({ distance: leg.distance, duration: leg.duration })),
                };
                try {
                    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(result));
                } catch {
                    // storage full: route still works for this session
                }
                return result;
            })
            .finally(() => pending.delete(key));
        pending.set(key, request);
    }
    return pending.get(key);
}

export function formatDistance(meters) {
    if (meters < 1000) {
        return `${Math.round(meters / 10) * 10} m`;
    }
    return `${(meters / 1000).toLocaleString('de-DE', { maximumFractionDigits: 1 })} km`;
}

export function formatDuration(seconds) {
    const minutes = Math.max(1, Math.round(seconds / 60));
    if (minutes < 60) {
        return `${minutes} Min.`;
    }
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest ? `${hours} Std. ${rest} Min.` : `${hours} Std.`;
}

export function formatWalk({ distance, duration }) {
    return `${formatDistance(distance)} · ca. ${formatDuration(duration)} zu Fuß`;
}
