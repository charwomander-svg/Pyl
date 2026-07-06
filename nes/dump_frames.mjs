import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { NES, Controller } from 'jsnes';
import { PNG } from 'pngjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const romPath = path.join(__dirname, 'build/game.nes');
const romData = fs.readFileSync(romPath, 'binary');

let frameBuffer = null;
const nes = new NES({
  onFrame: function (fb) { frameBuffer = fb; },
  onAudioSample: function () {},
});
nes.loadROM(romData);

function runFrames(n) { for (let i = 0; i < n; i++) nes.frame(); }
const B = {
  A: Controller.BUTTON_A, B: Controller.BUTTON_B, START: Controller.BUTTON_START,
  UP: Controller.BUTTON_UP, DOWN: Controller.BUTTON_DOWN, LEFT: Controller.BUTTON_LEFT, RIGHT: Controller.BUTTON_RIGHT,
};
function press(btn) { nes.buttonDown(1, btn); runFrames(2); nes.buttonUp(1, btn); runFrames(2); }

function saveFrame(name) {
  const png = new PNG({ width: 256, height: 240 });
  for (let i = 0; i < 256 * 240; i++) {
    const color = frameBuffer[i];
    const r = color & 0xff, g = (color >> 8) & 0xff, b = (color >> 16) & 0xff;
    png.data[i * 4] = r;
    png.data[i * 4 + 1] = g;
    png.data[i * 4 + 2] = b;
    png.data[i * 4 + 3] = 255;
  }
  const outPath = path.join(__dirname, 'shots', name + '.png');
  fs.writeFileSync(outPath, PNG.sync.write(png));
  console.log('Saved', outPath);
}

fs.mkdirSync(path.join(__dirname, 'shots'), { recursive: true });

runFrames(60);
saveFrame('01_title');

press(B.START);
runFrames(10);
saveFrame('02_pick_own');

press(B.A); // pick case 0 as own
runFrames(10);
saveFrame('03_open_prompt');

press(B.RIGHT); press(B.A); runFrames(5);
saveFrame('04_after_one_open');

press(B.RIGHT); press(B.A); runFrames(5);
press(B.RIGHT); press(B.A); runFrames(5);
saveFrame('05_offer_screen');

press(B.B); // no deal
runFrames(10);
saveFrame('06_round2_prompt');

for (let i = 0; i < 3; i++) { press(B.RIGHT); press(B.A); runFrames(5); }
saveFrame('07_offer2');

press(B.B);
runFrames(10);
for (let i = 0; i < 2; i++) { press(B.RIGHT); press(B.A); runFrames(5); }
saveFrame('08_offer3_or_swap');

press(B.B);
runFrames(10);
saveFrame('09_swap_prompt');

press(B.A); // keep
runFrames(10);
saveFrame('10_final_result');

console.log('Done');
