import {
  BOARD_SPACES,
  createGame,
  formatMoney,
  getCurrentPlayer,
  passCurrentPlayer,
  performAIAction,
  nextActivePlayerIndex,
  spinCurrentPlayer
} from './game.js';

const AI_TURN_DELAY_MS = 700;

const elements = {
  board: document.querySelector('#board'),
  controls: document.querySelector('#controls'),
  currentPlayer: document.querySelector('#current-player'),
  status: document.querySelector('#status'),
  message: document.querySelector('#message'),
  players: document.querySelector('#players'),
  log: document.querySelector('#log'),
  spin: document.querySelector('#spin-button'),
  pass: document.querySelector('#pass-button'),
  reset: document.querySelector('#reset-button')
};

let state = createGame();
let aiTimer = null;

function clearAiTimer() {
  if (aiTimer) {
    window.clearTimeout(aiTimer);
    aiTimer = null;
  }
}

function canCurrentPlayerPass() {
  const current = getCurrentPlayer(state);
  return Boolean(
    current?.human &&
      !state.finished &&
      current.spins > 0 &&
      nextActivePlayerIndex(state) !== -1
  );
}

function renderBoard() {
  elements.board.innerHTML = BOARD_SPACES.map((space, index) => {
    const isHot = state.lastSpaceIndex === index;
    let detail = 'Whammy';

    if (space.type === 'cash' || space.type === 'prize') {
      detail = formatMoney(space.amount);
    } else if (space.type === 'double') {
      detail = 'Double Cash';
    } else if (space.type === 'extra') {
      detail = '+1 spin';
    }

    return `
      <li class="board-space ${space.type} ${isHot ? 'active' : ''}">
        <span class="space-label">${space.label}</span>
        <span class="space-type">${detail}</span>
      </li>
    `;
  }).join('');
}

function renderPlayers() {
  elements.players.innerHTML = state.players.map((player, index) => {
    const active = index === state.currentPlayerIndex && !state.finished;
    return `
      <article class="player-card ${active ? 'active' : ''} ${player.eliminated ? 'eliminated' : ''}">
        <h2>${player.name}</h2>
        <dl>
          <div><dt>Cash</dt><dd>${formatMoney(player.cash)}</dd></div>
          <div><dt>Spins</dt><dd>${player.spins}</dd></div>
          <div><dt>Whammies</dt><dd>${player.whammies}</dd></div>
        </dl>
        <p>${player.eliminated ? 'Out of the round' : player.human ? 'Human player' : 'AI player'}</p>
      </article>
    `;
  }).join('');
}

function renderLog() {
  elements.log.innerHTML = state.log.map((entry) => `<li>${entry}</li>`).join('');
}

function renderControls() {
  const current = getCurrentPlayer(state);
  const canAct = current?.human && !state.finished && current.spins > 0;
  const canPass = canCurrentPlayerPass();

  elements.spin.disabled = !canAct;
  elements.pass.disabled = !canPass;
  elements.reset.disabled = false;

  if (state.finished) {
    elements.currentPlayer.textContent = `${state.winner.name} wins with ${formatMoney(state.winner.cash)}.`;
    elements.status.textContent = 'Game over';
  } else if (current) {
    elements.currentPlayer.textContent = `${current.name}'s turn`;
    elements.status.textContent = current.human ? 'Your move' : 'Computer thinking';
  }

  elements.message.textContent = state.message;
}

function render() {
  clearAiTimer();
  renderBoard();
  renderPlayers();
  renderLog();
  renderControls();

  if (!state.finished && getCurrentPlayer(state)?.human === false) {
    aiTimer = window.setTimeout(runAiTurn, AI_TURN_DELAY_MS);
  }
}

function runAiTurn() {
  aiTimer = null;

  if (state.finished) {
    render();
    return;
  }

  const current = getCurrentPlayer(state);
  if (!current || current.human) {
    render();
    return;
  }

  performAIAction(state);
  render();

  if (!state.finished && getCurrentPlayer(state)?.human === false) {
    aiTimer = window.setTimeout(runAiTurn, AI_TURN_DELAY_MS);
  }
}

function handleSpin() {
  spinCurrentPlayer(state);
  render();
}

function handlePass() {
  passCurrentPlayer(state);
  render();
}

function handleReset() {
  state = createGame();
  render();
}

elements.spin.addEventListener('click', handleSpin);
elements.pass.addEventListener('click', handlePass);
elements.reset.addEventListener('click', handleReset);

render();
