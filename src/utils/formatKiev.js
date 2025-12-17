export function formatKiev(date = new Date()) {
    return date.toLocaleString('uk-UA', { timeZone: 'Europe/Kiev' });
}