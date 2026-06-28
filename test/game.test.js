import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BOARD_SPACES,
  applySpace,
  createGame,
  determineWinner,
  passCurrentPlayer,
  spinCurrentPlayer
} from '../game.js';

test('createGame sets up three contestants', () => {
  const state = createGame();

  assert.equal(state.players.length, 3);
  assert.equal(state.currentPlayerIndex, 0);
  assert.equal(state.players[0].spins, 4);
  assert.equal(state.players[1].spins, 4);
  assert.equal(state.players[2].spins, 4);
});

test('spinCurrentPlayer resolves a cash space', () => {
  const state = createGame();

  spinCurrentPlayer(state, () => 0);

  assert.equal(state.players[0].cash, 500);
  assert.equal(state.players[0].spins, 3);
  assert.equal(state.currentPlayerIndex, 0);
  assert.equal(state.lastSpaceIndex, 0);
  assert.equal(state.message.includes('$500'), true);
});

test('extra spin keeps the player alive with a net zero spin change', () => {
  const state = createGame();
  state.players[0].spins = 1;

  const extraSpinIndex = BOARD_SPACES.findIndex((space) => space.type === 'extra');
  spinCurrentPlayer(state, () => extraSpinIndex / BOARD_SPACES.length);

  assert.equal(state.players[0].spins, 1);
});

test('double cash space doubles the player bankroll', () => {
  const state = createGame();
  state.players[0].cash = 1200;

  applySpace(state, 0, { type: 'double', label: 'Double Cash' });

  assert.equal(state.players[0].cash, 2400);
  assert.equal(state.message.includes('doubles their cash'), true);
});

test('double cash space does nothing when bankroll is zero', () => {
  const state = createGame();

  applySpace(state, 0, { type: 'double', label: 'Double Cash' });

  assert.equal(state.players[0].cash, 0);
  assert.equal(state.message.includes('has nothing to double'), true);
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
  state.players[1].spins = 0;
  state.players[0].spins = 3;
  state.currentPlayerIndex = 0;

  passCurrentPlayer(state);

  assert.equal(state.players[0].spins, 0);
  assert.equal(state.players[2].spins, 7);
  assert.equal(state.currentPlayerIndex, 2);
});

test('determineWinner picks the highest cash total', () => {
  const state = createGame();
  state.players[0].cash = 1000;
  state.players[1].cash = 2500;
  state.players[2].cash = 1500;

  assert.equal(determineWinner(state).name, 'CPU 1');
});
