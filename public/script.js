// Establish a socket connection to the server
const socket = io();

// Get references to DOM elements
const rootElement = document.documentElement;
const roomSelectionDiv = document.getElementById('room-selection');
const gameAreaDiv = document.getElementById('game-area');
const usernameInput = document.getElementById('username-input');
const createRoomNameInput = document.getElementById('create-room-name-input');
const joinRoomNameInput = document.getElementById('join-room-name-input');
const createRoomBtn = document.getElementById('create-room-btn');
const joinRoomBtn = document.getElementById('join-room-btn');
const revealBtn = document.getElementById('reveal-btn');
const resetBtn = document.getElementById('reset-btn');
const shareBtn = document.getElementById('share-btn');
const copyFeedbackSpan = document.getElementById('copy-feedback');
const currentRoomNameSpan = document.getElementById('current-room-name');
const participantsList = document.getElementById('participants-list');
const cardsContainer = document.getElementById('cards-container');
const votesDisplayDiv = document.getElementById('votes-display');
const darkModeToggle = document.getElementById('dark-mode-toggle');
const themeLabel = document.getElementById('theme-label');
const controlButtonsDiv = document.getElementById('control-buttons');

let myUsername = '';
let currentRoom = '';
let myVote = null;
let currentRoomState = {};

// Create the voting cards
function createCards() {
  const cardValues = ['1', '2', '3', '5', '8', '13', '21', '?', '☕'];
  cardsContainer.innerHTML = '';
  cardValues.forEach(value => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="card-inner">
        <div class="card-face front">${value}</div>
        <div class="card-face back"></div>
      </div>
    `;
    card.addEventListener('click', () => handleVote(value));
    cardsContainer.appendChild(card);
  });
}

// Handle a vote
function handleVote(vote) {
  if (currentRoomState.revealed) return;

  myVote = vote;
  document.querySelectorAll('.card').forEach(c => c.classList.remove('selected'));
  const selected = Array.from(cardsContainer.children).find(card => card.textContent.trim() === vote);
  if (selected) selected.classList.add('selected');

  socket.emit('vote', { room: currentRoom, username: myUsername, vote: myVote });
}

// Update UI based on server state
function updateUI(roomState) {
  currentRoomState = roomState;
  currentRoomNameSpan.textContent = currentRoom;
  participantsList.innerHTML = '';
  votesDisplayDiv.innerHTML = '';

  for (const [username, vote] of Object.entries(roomState.votes)) {
    const listItem = document.createElement('li');
    listItem.textContent = `${username}${username === roomState.facilitator ? ' (Facilitator)' : ''}`;
    if (vote !== null) {
      listItem.classList.add('voted');
    }
    participantsList.appendChild(listItem);

    const voteCard = document.createElement('div');
    voteCard.className = `vote-card ${vote !== null ? 'voted' : ''} ${roomState.revealed ? 'revealed' : ''}`;

    const cardInner = document.createElement('div');
    cardInner.className = 'card-inner';

    const frontFace = document.createElement('div');
    frontFace.className = 'card-face front';
    frontFace.textContent = vote !== null ? (roomState.revealed ? vote : '✓') : '?';

    const backFace = document.createElement('div');
    backFace.className = 'card-face back';

    cardInner.appendChild(frontFace);
    cardInner.appendChild(backFace);
    voteCard.appendChild(cardInner);
    votesDisplayDiv.appendChild(voteCard);
  }

  // Show/hide individual buttons
  if (myUsername === roomState.facilitator) {
    revealBtn.style.display = roomState.revealed ? 'none' : 'block';
    resetBtn.style.display = roomState.revealed ? 'block' : 'none';
    controlButtonsDiv.classList.remove('hidden');
  } else {
    revealBtn.style.display = 'none';
    resetBtn.style.display = 'none';
    controlButtonsDiv.classList.add('hidden');
  }
}

// Validate input and emit socket event
function checkInputsAndProceed(roomName, username, emitEvent) {
  if (!roomName || !username) return alert('Room and name required');

  currentRoom = roomName;
  myUsername = username;

  const remember = document.getElementById('remember-me')?.checked;
  if (remember) {
    localStorage.setItem('pokerUsername', myUsername);
    localStorage.setItem('pokerRoom', currentRoom);
  } else {
    localStorage.removeItem('pokerUsername');
    localStorage.removeItem('pokerRoom');
  }

  socket.emit(emitEvent, { room: currentRoom, username: myUsername });
  currentRoomNameSpan.textContent = currentRoom;
  roomSelectionDiv.style.display = 'none';
  gameAreaDiv.style.display = 'block';
  createCards();
  return true;
}

// Event listeners
createRoomBtn.addEventListener('click', () => {
  checkInputsAndProceed(createRoomNameInput.value, usernameInput.value, 'createRoom');
});

joinRoomBtn.addEventListener('click', () => {
  checkInputsAndProceed(joinRoomNameInput.value, usernameInput.value, 'joinRoom');
});

revealBtn.addEventListener('click', () => {
  socket.emit('revealVotes', { room: currentRoom });
});

resetBtn.addEventListener('click', () => {
  socket.emit('resetVotes', { room: currentRoom });
});

shareBtn.addEventListener('click', () => {
  const url = `${window.location.origin}?room=${currentRoom}`;
  navigator.clipboard.writeText(url).then(() => {
    copyFeedbackSpan.style.display = 'inline';
    setTimeout(() => {
      copyFeedbackSpan.style.display = 'none';
    }, 2000);
  });
});

darkModeToggle.addEventListener('change', () => {
  if (darkModeToggle.checked) {
    rootElement.classList.add('dark-theme');
    themeLabel.textContent = 'Dark Mode';
    localStorage.setItem('pokerTheme', 'dark');
  } else {
    rootElement.classList.remove('dark-theme');
    themeLabel.textContent = 'Light Mode';
    localStorage.setItem('pokerTheme', 'light');
  }
});

// Listen to socket state updates
socket.on('updateState', (roomState) => {
  updateUI(roomState);
});

// Optional: log errors
socket.on('connect_error', (err) => {
  console.error('⚠️ Socket connection error:', err.message);
});

// Auto-load settings
(function initOnLoad() {
  const savedTheme = localStorage.getItem('pokerTheme');
  if (savedTheme === 'dark') {
    rootElement.classList.add('dark-theme');
    darkModeToggle.checked = true;
    themeLabel.textContent = 'Dark Mode';
  }

  const urlRoom = new URLSearchParams(window.location.search).get('room');
  const savedUsername = localStorage.getItem('pokerUsername');
  const savedRoom = localStorage.getItem('pokerRoom');

  if (savedUsername) {
    usernameInput.value = savedUsername;
  }

  if (urlRoom) {
    joinRoomNameInput.value = urlRoom;
    if (savedUsername) {
      checkInputsAndProceed(urlRoom, savedUsername, 'joinRoom');
    }
  } else if (savedRoom && savedUsername) {
    checkInputsAndProceed(savedRoom, savedUsername, 'joinRoom');
  }
})();
