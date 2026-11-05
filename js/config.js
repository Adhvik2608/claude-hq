// Global dimensions and the room plan of the house. All units are metres.
// Axes: +X right (east), +Y up, +Z toward the front gate (south).

export const FH = 4;              // floor-to-floor height
export const SLAB = 0.3;          // slab thickness
export const CEIL = FH - SLAB;    // clear ceiling height
export const HX = 16;             // half width of the house
export const HZ = 12;             // half depth of the house
export const A = 5.5;             // half size of the central atrium hall
export const GROUND_Y = -0.45;    // garden level (house plinth sits above it)
export const NUM_FLOORS = 5;      // G, 1, 2, 3 and the Sky Terrace

// Spiral staircase that wraps the glass lift in the atrium.
export const STAIR = {
  cx: 0, cz: 0,
  rIn: 1.5,          // inner edge (glass lift shaft)
  rOut: 3.5,         // outer edge
  rHole: 3.62,       // slab opening + balustrade
  landing: 0.36,     // half-angle of the flat landing at each floor (radians)
  steps: 24,         // treads per turn
};
export const LIFT = { r: 1.32, shaftR: 1.5, doorHalf: 0.42, speed: 1.6 };

export const floorY = (n) => n * FH;

export const FLOORS = [
  { id: 0, name: 'Ground Floor', short: 'G' },
  { id: 1, name: 'First Floor', short: '1' },
  { id: 2, name: 'Second Floor', short: '2' },
  { id: 3, name: 'Third Floor', short: '3' },
  { id: 4, name: 'Sky Terrace', short: 'T' },
];

// rect: [x0, z0, x1, z1]. spawn: [x, z, yaw] (yaw 0 faces +Z, PI faces -Z).
export const ROOMS = [
  // Ground
  { id: 'foyer', floor: 0, name: 'Grand Foyer', rect: [-5.5, 5.5, 5.5, 12], spawn: [0, 10.5, Math.PI] },
  { id: 'temple', floor: 0, name: 'Mandir · Temple', rect: [-16, 0, -5.5, 12], spawn: [-7.5, 6, -Math.PI / 2] },
  { id: 'living', floor: 0, name: 'Living Room', rect: [-16, -12, -5.5, 0], spawn: [-7, -3, -Math.PI / 2] },
  { id: 'dining', floor: 0, name: 'Dining Hall', rect: [5.5, 0, 16, 12], spawn: [7, 6, Math.PI / 2] },
  { id: 'kitchen', floor: 0, name: 'Kitchen', rect: [5.5, -12, 16, 0], spawn: [7, -3, Math.PI / 2] },
  { id: 'store', floor: 0, name: 'Storeroom', rect: [-5.5, -12, -0.5, -5.5], spawn: [-3, -6.5, Math.PI] },
  { id: 'washroom', floor: 0, name: 'Washroom', rect: [-0.5, -12, 5.5, -5.5], spawn: [2.5, -6.5, Math.PI] },
  { id: 'atrium0', floor: 0, name: 'Atrium', rect: [-5.5, -5.5, 5.5, 5.5], spawn: [0, 4.6, Math.PI] },
  // First
  { id: 'music', floor: 1, name: 'Music Room', rect: [-16, -12, -5.5, 12], spawn: [-7, 0, -Math.PI / 2] },
  { id: 'library', floor: 1, name: 'Library', rect: [5.5, 0, 16, 12], spawn: [7, 3, Math.PI / 2] },
  { id: 'yoga', floor: 1, name: 'Yoga & Meditation', rect: [5.5, -12, 16, 0], spawn: [7, -3, Math.PI / 2] },
  { id: 'sunroom', floor: 1, name: 'Sunroom', rect: [-5.5, 5.5, 5.5, 12], spawn: [0, 7, 0] },
  { id: 'balcony1', floor: 1, name: 'Front Balcony', rect: [-5.5, 12, 5.5, 15], spawn: [0, 13.2, 0], outdoor: true },
  { id: 'gallery1', floor: 1, name: 'Atrium Gallery', rect: [-5.5, -12, 5.5, 5.5], spawn: [0, 4.6, Math.PI] },
  // Second
  { id: 'bedroom', floor: 2, name: 'Bedroom', rect: [-16, 0, -5.5, 12], spawn: [-7, 2.5, -Math.PI / 2] },
  { id: 'bathroom', floor: 2, name: 'Bathroom', rect: [-16, -12, -5.5, 0], spawn: [-7, -2.5, -Math.PI / 2] },
  { id: 'guest', floor: 2, name: 'Guest Bedroom', rect: [5.5, 0, 16, 12], spawn: [7, 2.5, Math.PI / 2] },
  { id: 'study', floor: 2, name: 'Study', rect: [5.5, -12, 16, 0], spawn: [7, -2.5, Math.PI / 2] },
  { id: 'lounge', floor: 2, name: 'Family Lounge', rect: [-5.5, 5.5, 5.5, 12], spawn: [0, 7, 0] },
  { id: 'gallery2', floor: 2, name: 'Atrium Gallery', rect: [-5.5, -12, 5.5, 5.5], spawn: [0, 4.6, Math.PI] },
  // Third
  { id: 'suite', floor: 3, name: 'Master Suite', rect: [-16, -3, -5.5, 12], spawn: [-7, 2.5, -Math.PI / 2] },
  { id: 'spa', floor: 3, name: 'Suite Spa Bath', rect: [-16, -12, -5.5, -3], spawn: [-12, -4.2, Math.PI] },
  { id: 'cinema', floor: 3, name: 'Home Cinema', rect: [5.5, -12, 16, 12], spawn: [7, 0, Math.PI / 2] },
  { id: 'tea', floor: 3, name: 'Chai Lounge', rect: [-5.5, 5.5, 5.5, 12], spawn: [0, 7, 0] },
  { id: 'balcony3', floor: 3, name: 'Grand Balcony', rect: [-16, 12, 5.5, 15.5], spawn: [-3, 13.5, 0], outdoor: true },
  { id: 'gallery3', floor: 3, name: 'Atrium Gallery', rect: [-5.5, -12, 5.5, 5.5], spawn: [0, 4.6, Math.PI] },
  // Terrace
  { id: 'pavilion', floor: 4, name: 'Sky Pavilion', rect: [-4.6, -4.6, 4.6, 4.6], spawn: [0, 4.2, 0] },
  { id: 'pool', floor: 4, name: 'Infinity Pool', rect: [6, -11, 15.5, 5], spawn: [6, 7, Math.PI / 2], outdoor: true },
  { id: 'terraceGarden', floor: 4, name: 'Terrace Garden', rect: [-15.5, -11.5, -6, 11.5], spawn: [-6, 0, -Math.PI / 2], outdoor: true },
  { id: 'terrace', floor: 4, name: 'Sky Terrace', rect: [-16, -12, 16, 12], spawn: [0, 7.5, 0], outdoor: true },
];

export const EXTERIOR_SPAWN = { x: 0, y: GROUND_Y, z: 40, yaw: Math.PI };

export function roomAt(x, z, floor) {
  // smaller rooms first so nested areas (pool, pavilion) win over their parent
  let best = null, bestArea = Infinity;
  for (const r of ROOMS) {
    if (r.floor !== floor) continue;
    const [x0, z0, x1, z1] = r.rect;
    if (x >= x0 && x <= x1 && z >= z0 && z <= z1) {
      const a = (x1 - x0) * (z1 - z0);
      if (a < bestArea) { best = r; bestArea = a; }
    }
  }
  return best;
}

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const NOTE_LABELS = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
export const SARGAM = ['Sa', 're', 'Re', 'ga', 'Ga', 'ma', 'Ma', 'Pa', 'dha', 'Dha', 'ni', 'Ni'];
export const SARGAM_DEVA = ['सा', 'रे॒', 'रे', 'ग॒', 'ग', 'म', 'म॑', 'प', 'ध॒', 'ध', 'नि॒', 'नि'];
