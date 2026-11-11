export const SIDE = 4096;
export const TOTAL = 1 << 24;
export const BITMAP_BYTES = TOTAL >>> 3;
// Rotate the three hexadecimal digits of the horizontal coordinate.
// Example: 0x100 -> 0x001, 0x001 -> 0x010, 0x010 -> 0x100.
export function permuteX(x) {
  return ((x & 0x0F) << 4) | ((x & 0xF0) << 4) | ((x & 0xF00) >>> 8);
}
export function unpermuteX(x) {
  return ((x & 0x00F) << 8) | ((x & 0x0F0) >>> 4) | ((x & 0xF00) >>> 4);
}
export function colorPosition(id) { return {x: permuteX(id & 4095), y: id >>> 12}; }
export function colorIdAt(x, y) { return (y * SIDE) + unpermuteX(x); }
export function colorHex(id) { return `#${id.toString(16).padStart(6, '0').toUpperCase()}`; }
