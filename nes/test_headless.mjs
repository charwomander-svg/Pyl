import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { NES, Controller } from 'jsnes';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const romPath = process.argv[2] || path.join(__dirname, 'build/game.nes');
const romData = fs.readFileSync(romPath, 'binary');

let frameBuffer = null;
const nes = new NES({
  onFrame: function (fb) { frameBuffer = fb; },
  onAudioSample: function () {},
});

nes.loadROM(romData);

function runFrames(n) {
  for (let i = 0; i < n; i++) nes.frame();
}

const B = {
  A: Controller.BUTTON_A,
  B: Controller.BUTTON_B,
  START: Controller.BUTTON_START,
  UP: Controller.BUTTON_UP,
  DOWN: Controller.BUTTON_DOWN,
  LEFT: Controller.BUTTON_LEFT,
  RIGHT: Controller.BUTTON_RIGHT,
};

function press(btn) {
  nes.buttonDown(1, btn);
  runFrames(2);
  nes.buttonUp(1, btn);
  runFrames(2);
}

function summarize(fb) {
  let nonzero = 0;
  for (let i = 0; i < fb.length; i++) if (fb[i] !== fb[0]) nonzero++;
  return nonzero;
}

try {
  console.log('Booting...');
  runFrames(60);
  console.log('After boot, distinct pixels:', summarize(frameBuffer));

  console.log('Pressing START to init game...');
  press(B.START);
  runFrames(10);
  console.log('After start, distinct pixels:', summarize(frameBuffer));

  console.log('Pick own case: press A immediately (case 0)');
  press(B.A);
  runFrames(10);
  console.log('After picking own case, distinct pixels:', summarize(frameBuffer));

  console.log('Opening cases round 1 (3 cases)...');
  for (let i = 0; i < 3; i++) {
    press(B.RIGHT);
    press(B.A);
    runFrames(5);
  }
  console.log('After round1 opens, distinct pixels:', summarize(frameBuffer));

  console.log('No deal...');
  press(B.B);
  runFrames(10);

  console.log('Opening cases round 2 (3 cases)...');
  for (let i = 0; i < 3; i++) {
    press(B.RIGHT);
    press(B.A);
    runFrames(5);
  }
  console.log('No deal again...');
  press(B.B);
  runFrames(10);

  console.log('Opening cases round 3 (2 cases)...');
  for (let i = 0; i < 2; i++) {
    press(B.RIGHT);
    press(B.A);
    runFrames(5);
  }
  console.log('No deal (final)...');
  press(B.B);
  runFrames(10);

  console.log('Final swap decision: keep (A)');
  press(B.A);
  runFrames(10);

  console.log('Game over screen reached, distinct pixels:', summarize(frameBuffer));
  console.log('SUCCESS: ran full game loop without crashing.');
} catch (e) {
  console.error('FAILURE:', e);
  process.exit(1);
}
