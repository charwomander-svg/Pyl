// Generates game.chr (8KB, 256 tiles x 16 bytes) for the NES Deal or No Deal homebrew.
// Tile layout:
//  0        = space (blank)
//  1-26     = 'A'-'Z'
//  27-36    = '0'-'9'
//  37       = '$'
//  38       = ','
//  39       = '.'
//  40       = ':'
//  41       = '?'
//  42       = '!'
//  43       = '-'
//  44       = solid block (full fill) - used for host/contestant figures (color via palette)
//  45       = case outline (briefcase icon, closed)
//  46       = cursor arrow (pointer used for selection)
//  47       = solid circle-ish (head block, reuse solid actually) -- unused, kept blank
//  48-255   = blank

const fs = require('fs');

// 5-wide x 7-tall glyphs, top-left aligned in the 8x8 tile (1px pad right/bottom).
const FONT = {
  'A': ['.###.','#...#','#...#','#####','#...#','#...#','#...#'],
  'B': ['####.','#...#','#...#','####.','#...#','#...#','####.'],
  'C': ['.####','#....','#....','#....','#....','#....','.####'],
  'D': ['####.','#...#','#...#','#...#','#...#','#...#','####.'],
  'E': ['#####','#....','#....','####.','#....','#....','#####'],
  'F': ['#####','#....','#....','####.','#....','#....','#....'],
  'G': ['.####','#....','#....','#.###','#...#','#...#','.####'],
  'H': ['#...#','#...#','#...#','#####','#...#','#...#','#...#'],
  'I': ['#####','..#..','..#..','..#..','..#..','..#..','#####'],
  'J': ['..###','...#.','...#.','...#.','...#.','#..#.','.##..'],
  'K': ['#...#','#..#.','#.#..','##...','#.#..','#..#.','#...#'],
  'L': ['#....','#....','#....','#....','#....','#....','#####'],
  'M': ['#...#','##.##','#.#.#','#...#','#...#','#...#','#...#'],
  'N': ['#...#','##..#','#.#.#','#..##','#...#','#...#','#...#'],
  'O': ['.###.','#...#','#...#','#...#','#...#','#...#','.###.'],
  'P': ['####.','#...#','#...#','####.','#....','#....','#....'],
  'Q': ['.###.','#...#','#...#','#...#','#.#.#','#..#.','.##.#'],
  'R': ['####.','#...#','#...#','####.','#.#..','#..#.','#...#'],
  'S': ['.####','#....','#....','.###.','....#','....#','####.'],
  'T': ['#####','..#..','..#..','..#..','..#..','..#..','..#..'],
  'U': ['#...#','#...#','#...#','#...#','#...#','#...#','.###.'],
  'V': ['#...#','#...#','#...#','#...#','#...#','.#.#.','..#..'],
  'W': ['#...#','#...#','#...#','#.#.#','#.#.#','##.##','#...#'],
  'X': ['#...#','#...#','.#.#.','..#..','.#.#.','#...#','#...#'],
  'Y': ['#...#','#...#','.#.#.','..#..','..#..','..#..','..#..'],
  'Z': ['#####','....#','...#.','..#..','.#...','#....','#####'],
  '0': ['.###.','#...#','#..##','#.#.#','##..#','#...#','.###.'],
  '1': ['..#..','.##..','..#..','..#..','..#..','..#..','.###.'],
  '2': ['.###.','#...#','....#','...#.','..#..','.#...','#####'],
  '3': ['####.','....#','...#.','..##.','....#','....#','####.'],
  '4': ['...#.','..##.','.#.#.','#..#.','#####','...#.','...#.'],
  '5': ['#####','#....','####.','....#','....#','#...#','.###.'],
  '6': ['..##.','.#...','#....','####.','#...#','#...#','.###.'],
  '7': ['#####','....#','...#.','..#..','..#..','..#..','..#..'],
  '8': ['.###.','#...#','#...#','.###.','#...#','#...#','.###.'],
  '9': ['.###.','#...#','#...#','.####','....#','...#.','.##..'],
  '$': ['..#..','.####','#.#..','.###.','..#.#','####.','..#..'],
  ',': ['.....','.....','.....','.....','..##.','..#..','.#...'],
  '.': ['.....','.....','.....','.....','.....','.##..','.##..'],
  ':': ['.....','.##..','.##..','.....','.##..','.##..','.....'],
  '?': ['.###.','#...#','....#','...#.','..#..','.....','..#..'],
  '!': ['..#..','..#..','..#..','..#..','..#..','.....','..#..'],
  '-': ['.....','.....','.....','#####','.....','.....','.....'],
};

const CHARMAP_ORDER = [' ',
  'A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z',
  '0','1','2','3','4','5','6','7','8','9',
  '$',',','.',':','?','!','-'
];

function emptyTile() {
  return new Array(7).fill('.....');
}

function tileFromGlyph(rows) {
  // rows: array of up to 7 strings of length <=8, build 8x8 2bpp tile (plane0=pattern,plane1=0 -> color index1)
  const bytes = new Array(16).fill(0);
  for (let r = 0; r < 8; r++) {
    let rowStr = rows[r] || '';
    // pad to 8 chars
    while (rowStr.length < 8) rowStr += '.';
    let plane0 = 0;
    for (let c = 0; c < 8; c++) {
      if (rowStr[c] === '#') {
        plane0 |= (1 << (7 - c));
      }
    }
    bytes[r] = plane0;      // plane 0
    bytes[r + 8] = 0;       // plane 1 (all zero -> color index 1 when plane0 bit set)
  }
  return bytes;
}

function solidTile() {
  const bytes = new Array(16).fill(0);
  for (let r = 0; r < 8; r++) {
    bytes[r] = 0xFF;
    bytes[r + 8] = 0;
  }
  return bytes;
}

function caseOutlineTile() {
  // simple briefcase icon: rectangle border + handle nub top middle
  const rows = [
    '..##...',
    '########',
    '#......#',
    '#......#',
    '#......#',
    '#......#',
    '########',
    '........'
  ];
  return tileFromGlyph(rows);
}

function cursorArrowTile() {
  const rows = [
    '#.......',
    '##......',
    '###.....',
    '####....',
    '###.....',
    '##......',
    '#.......',
    '........'
  ];
  return tileFromGlyph(rows);
}

// Build 256-tile CHR bank (4KB used for background AND sprites, both point here)
const TILES = [];
for (let i = 0; i < 256; i++) TILES.push(new Array(16).fill(0));

// tile 0 = blank (space) -- stays all zero
CHARMAP_ORDER.forEach((ch, idx) => {
  if (ch === ' ') return; // tile 0 stays blank
  const glyph = FONT[ch];
  TILES[idx] = tileFromGlyph(glyph);
});

TILES[44] = solidTile();
TILES[45] = caseOutlineTile();
TILES[46] = cursorArrowTile();

// We only need 4KB (256 tiles) since both BG and sprites reuse the same pattern table.
// But NES CHR-ROM is typically in 8KB banks; mirror the same 4KB twice to fill 8KB bank.
const bank = Buffer.alloc(16 * 256);
for (let i = 0; i < 256; i++) {
  for (let b = 0; b < 16; b++) {
    bank[i * 16 + b] = TILES[i][b];
  }
}
const full = Buffer.concat([bank, bank]); // 8KB total: pattern table 0 and pattern table 1 identical

fs.writeFileSync(__dirname + '/build/game.chr', full);
console.log('Wrote game.chr', full.length, 'bytes');
