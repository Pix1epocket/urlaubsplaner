export function googleMapsUrl({ lat, lng }) {
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

export function googleRouteUrl(points, travelMode = 'walking') {
    if (points.length < 2) {
        return null;
    }
    const toParam = ({ lat, lng }) => `${lat},${lng}`;
    const params = new URLSearchParams({
        api: '1',
        origin: toParam(points[0]),
        destination: toParam(points[points.length - 1]),
        travelmode: travelMode,
    });
    const waypoints = points.slice(1, -1).map(toParam).join('|');
    if (waypoints) {
        params.set('waypoints', waypoints);
    }
    return `https://www.google.com/maps/dir/?${params}`;
}

// bahn.de ignores station names without internal station IDs, so a prefilled search is not possible.
export const BAHN_SEARCH_URL = 'https://www.bahn.de/buchung/fahrplan/suche';
