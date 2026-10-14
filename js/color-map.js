export const SIDE = 4096;
export const TOTAL = 1 << 24;
export const BITMAP_BYTES = TOTAL >>> 3;
export function colorPosition(id) { return {x: id & 4095, y: id >>> 12}; }
export function colorHex(id) { return `#${id.toString(16).padStart(6, '0').toUpperCase()}`; }
