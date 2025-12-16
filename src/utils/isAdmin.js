export function isAdmin(msg) {
    return String(msg.from.id) === process.env.ADMIN_ID;
}