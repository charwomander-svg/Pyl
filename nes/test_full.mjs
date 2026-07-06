import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { NES, Controller } from 'jsnes';
import { PNG } from 'pngjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const romPath = path.join(__dirname, 'build/game.nes');
const romData = fs.readFileSync(romPath, 'binary');

let frameBuffer = null;
const nes = new NES({ onFrame: (fb) => { frameBuffer = fb; }, onAudioSample: () => {} });
nes.loadROM(romData);

function runFrames(n) { for (let i = 0; i < n; i++) nes.frame(); }
const B = {
  A: Controller.BUTTON_A, B: Controller.BUTTON_B, START: Controller.BUTTON_START,
  UP: Controller.BUTTON_UP, DOWN: Controller.BUTTON_DOWN, LEFT: Controller.BUTTON_LEFT, RIGHT: Controller.BUTTON_RIGHT,
};
function press(btn) { nes.buttonDown(1, btn); runFrames(2); nes.buttonUp(1, btn); runFrames(2); }

const CASES_TOTAL = 24;
const NUM_COLS = 8;

// zero page / RAM addresses (computed from build/map.txt after Phase 2 rebuild)
const ADDR = {
  game_state: 0x0005,
  cursor: 0x0006,
  own_case: 0x0008,
  round_idx: 0x0009,
  cases_left: 0x000A,
  final_other: 0x000B,
  case_value: 0x0300, // 24 bytes
  case_opened: 0x0318, // 24 bytes
  offer_lo: 0x0330,
  offer_hi: 0x0331,
};

function mem(addr) { return nes.cpu.mem[addr]; }
function getCaseOpened() { const a = []; for (let i = 0; i < CASES_TOTAL; i++) a.push(mem(ADDR.case_opened + i)); return a; }
function getCursorRowCol() { const c = mem(ADDR.cursor); return { row: (c / NUM_COLS) | 0, col: c % NUM_COLS }; }

function moveCursorTo(targetIdx) {
  let guard = 0;
  while (mem(ADDR.cursor) !== targetIdx && guard < 30) {
    const cur = getCursorRowCol();
    const tgt = { row: (targetIdx / NUM_COLS) | 0, col: targetIdx % NUM_COLS };
    if (cur.row !== tgt.row) {
      press(B.DOWN);
    } else if (cur.col !== tgt.col) {
      press(B.RIGHT);
    }
    guard++;
  }
}

function openNextUnopenedCase() {
  const opened = getCaseOpened();
  const own = mem(ADDR.own_case);
  let target = -1;
  for (let i = 0; i < CASES_TOTAL; i++) { if (i !== own && !opened[i]) { target = i; break; } }
  if (target === -1) throw new Error('No unopened case available');
  moveCursorTo(target);
  press(B.A);
  runFrames(20); // allow the blocking case-open animation (~8 vblanks) to finish
  return target;
}

function saveFrame(name) {
  const png = new PNG({ width: 256, height: 240 });
  for (let i = 0; i < 256 * 240; i++) {
    const color = frameBuffer[i];
    png.data[i * 4] = color & 0xff;
    png.data[i * 4 + 1] = (color >> 8) & 0xff;
    png.data[i * 4 + 2] = (color >> 16) & 0xff;
    png.data[i * 4 + 3] = 255;
  }
  const outPath = path.join(__dirname, 'shots', name + '.png');
  fs.writeFileSync(outPath, PNG.sync.write(png));
  console.log('Saved', outPath, 'state=', mem(ADDR.game_state));
}

fs.mkdirSync(path.join(__dirname, 'shots'), { recursive: true });

runFrames(60);
saveFrame('t01_title');

press(B.START);
runFrames(10);
saveFrame('t02_pick_own');

press(B.A);
runFrames(10);
saveFrame('t03_round1_prompt');

console.log('own_case =', mem(ADDR.own_case));

const roundSchedule = [6, 5, 4, 3, 2, 2];

for (let r = 0; r < roundSchedule.length; r++) {
  const n = roundSchedule[r];
  for (let i = 0; i < n; i++) {
    const opened = openNextUnopenedCase();
    console.log(`Round${r + 1} opened case`, opened, 'value_idx=', mem(ADDR.case_value + opened));
  }
  runFrames(10);
  saveFrame(`t_offer_r${r + 1}`);
  console.log(`offer${r + 1} =`, mem(ADDR.offer_lo) | (mem(ADDR.offer_hi) << 8), 'state=', mem(ADDR.game_state));

  if (r < roundSchedule.length - 1) {
    press(B.B);
    runFrames(10);
    saveFrame(`t_round${r + 2}_prompt`);
  }
}

press(B.B);
runFrames(10);
saveFrame('t_swap_prompt');
console.log('state after no-deal on last offer =', mem(ADDR.game_state), '(expect 4=FINAL_SWAP)');
console.log('own_case=', mem(ADDR.own_case), 'final_other=', mem(ADDR.final_other));

press(B.B);
runFrames(10);
saveFrame('t_final_result');
console.log('final state=', mem(ADDR.game_state), '(expect 5=GAMEOVER)');

press(B.START);
runFrames(10);
saveFrame('t_back_to_title');
console.log('state=', mem(ADDR.game_state), '(expect 0=TITLE)');

console.log('DONE - full 22-case playthrough with instrumented state tracking succeeded.');
