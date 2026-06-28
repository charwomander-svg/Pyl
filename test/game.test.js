import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BOARD_SPACES,
  applySpace,
  createGame,
  determineWinner,
  getTotalSpins,
  passCurrentPlayer,
  spinCurrentPlayer
} from '../game.js';

test('createGame sets up three contestants', () => {
  const state = createGame();

  assert.equal(state.players.length, 3);
  assert.equal(state.currentPlayerIndex, 0);
  assert.equal(state.players[0].earnedSpins, 4);
  assert.equal(state.players[0].passedSpins, 0);
  assert.equal(state.players[1].earnedSpins, 4);
  assert.equal(state.players[1].passedSpins, 0);
  assert.equal(state.players[2].earnedSpins, 4);
  assert.equal(state.players[2].passedSpins, 0);
});

test('spinCurrentPlayer resolves a cash space', () => {
  const state = createGame();

  spinCurrentPlayer(state, () => 0);

  assert.equal(state.players[0].cash, 500);
  assert.equal(state.players[0].earnedSpins, 3);
  assert.equal(state.players[0].passedSpins, 0);
  assert.equal(state.currentPlayerIndex, 0);
  assert.equal(state.lastSpaceIndex, 0);
  assert.equal(state.message.includes('$500'), true);
});

test('extra spin keeps the player alive with a net zero spin change', () => {
  const state = createGame();
  state.players[0].earnedSpins = 1;

  const extraSpinIndex = BOARD_SPACES.findIndex((space) => space.type === 'extra');
  spinCurrentPlayer(state, () => extraSpinIndex / BOARD_SPACES.length);

  assert.equal(getTotalSpins(state.players[0]), 1);
});

test('four whammies eliminate a player', () => {
  const state = createGame();

  for (let count = 0; count < 4; count += 1) {
    applySpace(state, 0, { type: 'whammy', label: 'Whammy!' });
  }

  assert.equal(state.players[0].whammies, 4);
  assert.equal(state.players[0].eliminated, true);
});

test('passCurrentPlayer transfers spins to the next active player', () => {
  const state = createGame();
  state.players[1].earnedSpins = 0;
  state.players[2].earnedSpins = 4;
  state.players[0].earnedSpins = 3;
  state.currentPlayerIndex = 0;

  passCurrentPlayer(state);

  assert.equal(state.players[0].earnedSpins, 0);
  assert.equal(state.players[2].earnedSpins, 4);
  assert.equal(state.players[2].passedSpins, 3);
  assert.equal(getTotalSpins(state.players[2]), 7);
  assert.equal(state.currentPlayerIndex, 2);
});

test('spin consumes passed spins before earned spins', () => {
  const state = createGame();
  state.players[0].earnedSpins = 2;
  state.players[0].passedSpins = 1;

  spinCurrentPlayer(state, () => 0);

  assert.equal(state.players[0].earnedSpins, 2);
  assert.equal(state.players[0].passedSpins, 0);
});

test('determineWinner picks the highest cash total', () => {
  const state = createGame();
  state.players[0].cash = 1000;
  state.players[1].cash = 2500;
  state.players[2].cash = 1500;

  assert.equal(determineWinner(state).name, 'CPU 1');
});
