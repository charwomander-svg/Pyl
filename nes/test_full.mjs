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

// zero page / RAM addresses (computed from linker layout)
const ADDR = {
  game_state: 0x0005,
  cursor: 0x0006,
  own_case: 0x0008,
  case_value: 0x0300, // 10 bytes
  case_opened: 0x030A, // 10 bytes
  offer_lo: 0x0314,
  offer_hi: 0x0315,
};

function mem(addr) { return nes.cpu.mem[addr]; }
function getCaseOpened() { const a = []; for (let i = 0; i < 10; i++) a.push(mem(ADDR.case_opened + i)); return a; }
function getCursorRowCol() { const c = mem(ADDR.cursor); return { row: (c / 5) | 0, col: c % 5 }; }

function moveCursorTo(targetIdx) {
  // grid: 2 rows x 5 cols. Move via LEFT/RIGHT within row, UP/DOWN toggles row.
  let guard = 0;
  while (mem(ADDR.cursor) !== targetIdx && guard < 20) {
    const cur = getCursorRowCol();
    const tgt = { row: (targetIdx / 5) | 0, col: targetIdx % 5 };
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
  for (let i = 0; i < 10; i++) { if (i !== own && !opened[i]) { target = i; break; } }
  if (target === -1) throw new Error('No unopened case available');
  moveCursorTo(target);
  press(B.A);
  runFrames(3);
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

// pick own case = index 0 (cursor already there)
press(B.A);
runFrames(10);
saveFrame('t03_round1_prompt');

console.log('own_case =', mem(ADDR.own_case));

// Round 1: open 3 cases
for (let i = 0; i < 3; i++) {
  const opened = openNextUnopenedCase();
  console.log('Round1 opened case', opened, 'value_idx=', mem(ADDR.case_value + opened));
}
runFrames(10);
saveFrame('t04_offer1');
console.log('offer1 =', mem(ADDR.offer_lo) | (mem(ADDR.offer_hi) << 8), 'state=', mem(ADDR.game_state));

press(B.B); // no deal
runFrames(10);
saveFrame('t05_round2_prompt');

// Round 2: open 3 cases
for (let i = 0; i < 3; i++) {
  const opened = openNextUnopenedCase();
  console.log('Round2 opened case', opened, 'value_idx=', mem(ADDR.case_value + opened));
}
runFrames(10);
saveFrame('t06_offer2');
console.log('offer2 =', mem(ADDR.offer_lo) | (mem(ADDR.offer_hi) << 8), 'state=', mem(ADDR.game_state));

press(B.B); // no deal
runFrames(10);
saveFrame('t07_round3_prompt');

// Round 3: open 2 cases
for (let i = 0; i < 2; i++) {
  const opened = openNextUnopenedCase();
  console.log('Round3 opened case', opened, 'value_idx=', mem(ADDR.case_value + opened));
}
runFrames(10);
saveFrame('t08_offer3');
console.log('offer3 =', mem(ADDR.offer_lo) | (mem(ADDR.offer_hi) << 8), 'state=', mem(ADDR.game_state));

press(B.B); // no deal -> should go to FINAL_SWAP
runFrames(10);
saveFrame('t09_swap_prompt');
console.log('state after no-deal on offer3 =', mem(ADDR.game_state), '(expect 4=FINAL_SWAP)');
console.log('own_case=', mem(ADDR.own_case), 'final_other=', mem(0x000B));

press(B.B); // swap
runFrames(10);
saveFrame('t10_final_result');
console.log('final state=', mem(ADDR.game_state), '(expect 5=GAMEOVER)');

press(B.START);
runFrames(10);
saveFrame('t11_back_to_title');
console.log('state=', mem(ADDR.game_state), '(expect 0=TITLE)');

console.log('DONE - full playthrough with instrumented state tracking succeeded.');
