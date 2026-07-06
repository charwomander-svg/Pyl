# Deal or No Deal — NES Homebrew

A minimal NES homebrew implementation of "Deal or No Deal", written in
straight 6502 assembly (ca65/ld65). Rendering is background-tiles only
(no sprites/DMA) to keep things fast to build — host and contestant are
shown as simple colored blocks at the top of the screen, Hollywood-Squares
style.

## Gameplay

- 10 briefcases holding hidden dollar amounts: $1, $10, $50, $100, $500,
  $1,000, $2,500, $5,000, $7,500, $10,000 (randomly shuffled into the
  cases each game via an 8-bit LFSR + Fisher-Yates shuffle).
- Pick your own case (it stays sealed until the end).
- Open cases in three rounds (3, 3, then 2) using the D-Pad + A.
- After each round, the "banker" computes an offer based on the average
  dollar value still hidden across all unopened cases (including yours),
  and asks: **A = Deal**, **B = No Deal**.
- After the third round, only your case and one other remain. If you
  reject the final offer, you choose to **A = Keep** your case or
  **B = Swap** for the other one, then it's revealed as your winnings.
- Press Start from the Game Over screen to play again.

## Controls

- D-Pad: move the case-select cursor
- A: confirm selection / Deal / Keep
- B: No Deal / Swap
- Start: begin game / restart after a round ends

## Building

Requires `ca65`/`ld65` (from the [cc65](https://cc65.github.io/) toolchain)
and Node.js (only used to regenerate the CHR tile graphics).

```powershell
# 1. Regenerate the CHR (tile graphics) bank
node gen_chr.cjs

# 2. Assemble and link the ROM
ca65 src\main.s -o build\main.o --cpu 6502
ld65 -C nes.cfg build\main.o -o build\game.nes
```

The resulting `build\game.nes` is a standard 40,976-byte iNES ROM
(mapper 0 / NROM, 32KB PRG, 8KB CHR) that runs in any NES emulator or on
an NES flash cart.

## Automated testing

Since no local NES emulator was available, this was verified with the
headless `jsnes` JavaScript emulator, driving the actual controller
inputs and reading zero-page/RAM state (game state, cursor, case values)
directly to confirm every state transition (title → pick case → 3 open
rounds → banker offers → final swap → reveal → restart) behaves
correctly, plus PNG frame dumps to visually confirm the screens render
as expected. See `test_full.mjs` and `dump_frames.mjs`.
