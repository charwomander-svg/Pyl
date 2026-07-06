# Deal or No Deal — NES Homebrew

A minimal NES homebrew implementation of "Deal or No Deal", written in
straight 6502 assembly (ca65/ld65). Rendering is background-tiles only
(no OAM sprites/DMA) to keep things fast to build — the host and
contestant are simple humanoid tile figures (head/body/legs) shown at
the top of the screen, Hollywood-Squares style, on a rudimentary stage.

## Gameplay

- **22 briefcases** (matching the real show's case count) holding hidden
  dollar amounts: $1, $5, $10, $25, $50, $75, $100, $200, $300, $400,
  $500, $600, $700, $800, $900, $1,000, $1,500, $2,000, $2,500, $3,000,
  $4,000, $5,000 — randomly shuffled into the cases each game via an
  8-bit LFSR + Fisher-Yates shuffle.
- Pick your own case (it stays sealed until the end).
- Open cases across **six rounds** (5, 5, 4, 3, 2, then 1) using the
  D-Pad + A. Each case opening plays a brief flicker animation and a
  noise "swoosh" sound effect before revealing its value.
- After each round, the "banker" computes an offer based on the average
  dollar value still hidden across all unopened cases (including yours),
  and asks: **A = Deal**, **B = No Deal**.
- After the sixth round, only your case and one other remain. If you
  reject the final offer, you choose to **A = Keep** your case or
  **B = Swap** for the other one, then it's revealed as your winnings.
- Press Start from the Game Over screen to play again.

## Audio

- A continuous low-volume, slow 4-step "tense" bassline plays on the
  APU's Square 1 channel throughout the game.
- Square 2 and the Noise channel provide short sound effects:
  cursor-move blip, confirm/select tone, case-open noise burst, and
  distinct Deal/No-Deal tones — all manually timed and muted (no
  reliance on the hardware length counter) to avoid stuck notes.

## Controls

- D-Pad: move the case-select cursor (2 rows x 11 columns)
- A: confirm selection / Deal / Keep
- B: No Deal / Swap
- Start: begin game / restart after a round ends

## Building

Requires `ca65`/`ld65` (from the [cc65](https://cc65.github.io/) toolchain)
and Node.js (only used to regenerate the CHR tile graphics and, if
desired, regenerate `src/main.s` via the data-driven generator script).

```powershell
# 1. Regenerate the CHR (tile graphics) bank
node gen_chr.cjs

# 2. (Optional) Regenerate src/main.s from the generator script
node gen_main.cjs

# 3. Assemble and link the ROM
ca65 src\main.s -o build\main.o --cpu 6502
ld65 -C nes.cfg build\main.o -o build\game.nes -m build\map.txt --dbgfile build\dbg.txt
```

The resulting `build\game.nes` is a standard 40,976-byte iNES ROM
(mapper 0 / NROM, 32KB PRG, 8KB CHR) that runs in any NES emulator or on
an NES flash cart.

## Automated testing

Since no local NES emulator was available, this was verified with the
headless `jsnes` JavaScript emulator, driving the actual controller
inputs and reading zero-page/RAM state (game state, cursor, case values,
round index, offers) directly to confirm every state transition (title →
pick case → 6 open rounds with correct case-left counts → banker offers
→ final swap → reveal → restart) behaves correctly, plus PNG frame dumps
to visually confirm the screens, humanoid host/contestant figures, and
22-case grid render as expected. A separate soak test runs 600 frames
(~10s) idling at the title screen to confirm the blinking "PRESS START"
text and continuous background music don't crash or hang the APU
emulation. See `test_full.mjs` and `dump_frames.mjs`.

Note: zero-page/RAM addresses used by the test harness are derived from
`build/map.txt` after each rebuild (declaration order in the `ZEROPAGE`
and `BSS` segments in `src/main.s`) — they will shift if variables are
added/removed/reordered.
