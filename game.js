export const STARTING_SPINS = 4;

export const BOARD_SPACES = [
  { type: 'cash', label: '$500', amount: 500 },
  { type: 'cash', label: '$750', amount: 750 },
  { type: 'cash', label: '$1,000', amount: 1000 },
  { type: 'cash', label: '$1,250', amount: 1250 },
  { type: 'extra', label: '+1 Spin' },
  { type: 'cash', label: '$1,500', amount: 1500 },
  { type: 'cash', label: '$2,000', amount: 2000 },
  { type: 'prize', label: 'Prize Box', amount: 2500 },
  { type: 'whammy', label: 'Whammy!' },
  { type: 'cash', label: '$750', amount: 750 },
  { type: 'cash', label: '$1,000', amount: 1000 },
  { type: 'extra', label: '+1 Spin' },
  { type: 'cash', label: '$2,500', amount: 2500 },
  { type: 'cash', label: '$3,000', amount: 3000 },
  { type: 'prize', label: 'Weekend Trip', amount: 4000 },
  { type: 'whammy', label: 'Whammy!' },
  { type: 'cash', label: '$4,000', amount: 4000 },
  { type: 'cash', label: '$5,000', amount: 5000 }
];

export function formatMoney(amount) {
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  });
}

function createPlayer(name, human = false) {
  return {
    name,
    human,
    cash: 0,
    spins: STARTING_SPINS,
    whammies: 0,
    eliminated: false
  };
}

export function createGame() {
  return {
    players: [
      createPlayer('You', true),
      createPlayer('CPU 1'),
      createPlayer('CPU 2')
    ],
    currentPlayerIndex: 0,
    finished: false,
    lastSpaceIndex: null,
    message: 'Welcome to Press Your Luck. Spin when you are ready.',
    log: ['New game started.'],
    winner: null
  };
}

export function getCurrentPlayer(state) {
  return state.players[state.currentPlayerIndex] ?? null;
}

export function nextActivePlayerIndex(state, fromIndex = state.currentPlayerIndex) {
  for (let offset = 1; offset <= state.players.length; offset += 1) {
    const index = (fromIndex + offset) % state.players.length;
    const player = state.players[index];
    if (!player.eliminated && player.spins > 0) {
      return index;
    }
  }

  return -1;
}

export function determineWinner(state) {
  return state.players.reduce((best, player) => {
    if (!best) {
      return player;
    }

    if (player.cash > best.cash) {
      return player;
    }

    if (player.cash === best.cash && player.whammies < best.whammies) {
      return player;
    }

    return best;
  }, null);
}

function pushLog(state, message) {
  state.message = message;
  state.log.unshift(message);
  state.log = state.log.slice(0, 8);
}

function endGameIfNeeded(state) {
  const nextIndex = nextActivePlayerIndex(state);

  if (nextIndex === -1) {
    state.finished = true;
    state.currentPlayerIndex = -1;
    state.winner = determineWinner(state);
    pushLog(
      state,
      `Game over — ${state.winner.name} wins with ${formatMoney(state.winner.cash)}.`
    );
    return true;
  }

  state.currentPlayerIndex = nextIndex;
  return false;
}

export function applySpace(state, playerIndex, space, spaceIndex = null) {
  const player = state.players[playerIndex];

  if (!player || player.eliminated || state.finished) {
    return state;
  }

  state.lastSpaceIndex = spaceIndex;

  switch (space.type) {
    case 'cash':
    case 'prize':
      player.cash += space.amount;
      pushLog(
        state,
        `${player.name} hits ${space.label} and banks ${formatMoney(space.amount)}.`
      );
      break;
    case 'extra':
      player.spins += 1;
      pushLog(state, `${player.name} earns an extra spin.`);
      break;
    case 'whammy':
      player.cash = 0;
      player.whammies += 1;
      pushLog(state, `${player.name} gets a WHAMMY!`);
      if (player.whammies >= 4) {
        player.eliminated = true;
        player.spins = 0;
        pushLog(state, `${player.name} is out of the round.`);
      }
      break;
    default:
      break;
  }

  return state;
}

export function spinCurrentPlayer(state, rng = Math.random) {
  if (state.finished) {
    return state;
  }

  const player = getCurrentPlayer(state);
  if (!player || player.eliminated || player.spins <= 0) {
    return state;
  }

  player.spins -= 1;
  const spaceIndex = Math.floor(rng() * BOARD_SPACES.length);
  const space = BOARD_SPACES[spaceIndex];

  applySpace(state, state.currentPlayerIndex, space, spaceIndex);

  if (player.eliminated || player.spins === 0) {
    endGameIfNeeded(state);
  }

  return state;
}

export function passCurrentPlayer(state) {
  if (state.finished) {
    return state;
  }

  const player = getCurrentPlayer(state);
  if (!player || player.eliminated || player.spins <= 0) {
    return state;
  }

  const nextIndex = nextActivePlayerIndex(state);
  if (nextIndex === -1) {
    return state;
  }

  const spinsToPass = player.spins;
  player.spins = 0;
  state.players[nextIndex].spins += spinsToPass;
  state.currentPlayerIndex = nextIndex;
  pushLog(
    state,
    `${player.name} passes ${spinsToPass} spin${spinsToPass === 1 ? '' : 's'} to ${state.players[nextIndex].name}.`
  );

  return state;
}

export function performAIAction(state, rng = Math.random) {
  const player = getCurrentPlayer(state);
  if (!player || player.human || state.finished) {
    return state;
  }

  if (player.spins <= 0) {
    endGameIfNeeded(state);
    return state;
  }

  if (player.cash >= 8000 || player.whammies >= 2 || player.spins >= 7) {
    passCurrentPlayer(state);
    return state;
  }

  spinCurrentPlayer(state, rng);
  return state;
}
