const THEME_KEY = 'urlaubsplaner.theme';

export const THEMES = { auto: 'Automatisch (wie iPhone)', light: 'Hell', dark: 'Dunkel' };

export function getTheme() {
    const theme = localStorage.getItem(THEME_KEY);
    return THEMES[theme] ? theme : 'auto';
}

export function setTheme(theme) {
    if (theme === 'auto') {
        localStorage.removeItem(THEME_KEY);
        delete document.documentElement.dataset.theme;
        return;
    }
    localStorage.setItem(THEME_KEY, theme);
    document.documentElement.dataset.theme = theme;
}
