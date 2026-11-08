// Numeração FDI: 11–18, 21–28, 31–38, 41–48 (permanentes) e 51–55, 61–65, 71–75, 81–85 (leite).
const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

// Na ficha o dentista vê o paciente de frente: o lado direito do paciente fica à esquerda da tela.
export const UPPER_PERMANENT = [...range(11, 18).reverse(), ...range(21, 28)];
export const LOWER_PERMANENT = [...range(41, 48).reverse(), ...range(31, 38)];
export const UPPER_DECIDUOUS = [...range(51, 55).reverse(), ...range(61, 65)];
export const LOWER_DECIDUOUS = [...range(81, 85).reverse(), ...range(71, 75)];
export const ALL_TEETH = [...range(11, 18), ...range(21, 28), ...range(31, 38), ...range(41, 48), ...range(51, 55), ...range(61, 65), ...range(71, 75), ...range(81, 85)];

export const isTooth = (n) => ALL_TEETH.includes(Number(n));
export const isDeciduous = (n) => Number(n) >= 51;

export const FACES = [
  { id: 'V', label: 'Vestibular' }, { id: 'L', label: 'Lingual/Palatina' }, { id: 'M', label: 'Mesial' },
  { id: 'D', label: 'Distal' }, { id: 'O', label: 'Oclusal/Incisal' },
];
/** ordem canônica das faces, igual à API: "OD" → "DO" */
export const normalizeFaces = (faces) => FACES.map((f) => f.id).filter((f) => String(faces ?? '').toUpperCase().includes(f)).join('');

const QUADRANT = { 1: 'superior direito', 2: 'superior esquerdo', 3: 'inferior esquerdo', 4: 'inferior direito', 5: 'superior direito (leite)', 6: 'superior esquerdo (leite)', 7: 'inferior esquerdo (leite)', 8: 'inferior direito (leite)' };
export const toothLabel = (n) => `Dente ${n} — ${QUADRANT[Math.floor(Number(n) / 10)] ?? ''}`.trim();
