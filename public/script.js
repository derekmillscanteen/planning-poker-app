// Updated script.js with UI/UX enhancements, accessibility, avatars, vote status, card flip animations

const roomSelectionDiv = document.getElementById('room-selection');
const gameAreaDiv = document.getElementById('game-area');

const usernameInput = document.getElementById('username-input');

const createRoomNameInput = document.getElementById('create-room-name-input');
const createRoomBtn = document.getElementById('create-room-btn');
const joinRoomNameInput = document.getElementById('join-room-name-input');
const joinRoomBtn = document.getElementById('join-room-btn');

const currentRoomNameSpan = document.getElementById('current-room-name');
const cardsContainer = document.getElementById('cards-container');
const votesDisplay = document.getElementById('votes-display');
const revealBtn = document.getElementById('reveal-btn');
const resetBtn = document.getElementById('reset-btn');
const participantsListDiv = document.getElementById('participants-list');
const shareBtn = document.getElementById('share-btn');
const copyFeedbackSpan = document.getElementById('copy-feedback');
const voteSummaryDiv = document.getElementById('vote-summary');
const facilitatorDisplay = document.getElementById('facilitator-display');

const darkModeToggle = document.getElementById('dark-mode-toggle');
const rootElement = document.documentElement;
const themeLabel = document.querySelector('.theme-label');

const cardValues = ['1', '2', '3', '5', '8', '13', '21', '?'];
let currentRoom = '';
let myVote = null;
let myUsername = 'Anonymous';
let isFacilitator = false;
let allVotes = {};
let hasRevealed = false;
let currentFacilitator = '';

const socket = io(window.location.origin);

socket.on('connect', () => console.log('Connected'));
socket.on('connect_error', (err) => console.error('Connection error:', err));

socket.on('updateState', (state) => {
    allVotes = state.votes;
    hasRevealed = state.revealed;
    isFacilitator = (state.facilitator === myUsername);
    currentFacilitator = state.facilitator;
    updateUI();
});

function createCards() {
    cardsContainer.innerHTML = '';
    cardValues.forEach(value => {
        const cardWrapper = document.createElement('div');
        cardWrapper.classList.add('card');
        cardWrapper.setAttribute('tabindex', '0');
        cardWrapper.setAttribute('role', 'button');
        cardWrapper.setAttribute('aria-label', `Vote ${value}`);

        const cardFront = document.createElement('div');
        cardFront.classList.add('card-face', 'front');
        cardFront.textContent = '?';

        const cardBack = document.createElement('div');
        cardBack.classList.add('card-face', 'back');
        cardBack.textContent = value;

        const inner = document.createElement('div');
        inner.classList.add('card-inner');
        inner.appendChild(cardFront);
        inner.appendChild(cardBack);

        cardWrapper.appendChild(inner);
        cardWrapper.addEventListener('click', () => selectCard(cardWrapper, value));
        cardWrapper.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') selectCard(cardWrapper, value);
        });

        cardsContainer.appendChild(cardWrapper);
    });
}

function selectCard(selectedCard, value) {
    if (hasRevealed) return;
    document.querySelectorAll('.card').forEach(card => card.classList.remove('selected'));
    myVote = value;
    selectedCard.classList.add('selected');
    socket.emit('vote', { room: currentRoom, username: myUsername, vote: myVote });
}

function generateAvatar(name) {
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase();
    const hue = (name.charCodeAt(0) * 40) % 360;
    return `<span class="avatar" style="background-color: hsl(${hue}, 70%, 60%)">${initials}</span>`;
}

function updateParticipantsList() {
    participantsListDiv.innerHTML = '';
    const participants = Object.keys(allVotes);
    if (participants.length === 0) {
        participantsListDiv.textContent = 'No participants yet...';
        return;
    }
    participants.forEach(user => {
        const participantDiv = document.createElement('div');
        participantDiv.classList.add('participant-entry');
        participantDiv.innerHTML = generateAvatar(user) +
            `<span class="participant-name">${user}</span>`;
        if (allVotes[user] === null) {
            participantDiv.classList.add('waiting');
        } else {
            participantDiv.classList.add('has-voted');
        }
        participantsListDiv.appendChild(participantDiv);
    });
}

function displayVotes() {
    votesDisplay.innerHTML = '';
    Object.entries(allVotes).forEach(([user, vote]) => {
        const voteCard = document.createElement('div');
        voteCard.classList.add('vote-card');
        voteCard.textContent = vote || '?';
        votesDisplay.appendChild(voteCard);
    });
}

function displayVoteSummary() {
    voteSummaryDiv.innerHTML = '';
    const votes = Object.values(allVotes).map(v => parseInt(v)).filter(v => !isNaN(v));
    if (!votes.length) return;
    const avg = (votes.reduce((a, b) => a + b) / votes.length).toFixed(1);
    votes.sort((a, b) => a - b);
    const mid = Math.floor(votes.length / 2);
    const median = votes.length % 2 ? votes[mid] : ((votes[mid - 1] + votes[mid]) / 2).toFixed(1);
    voteSummaryDiv.innerHTML = `<p><strong>Average:</strong> ${avg}</p><p><strong>Median:</strong> ${median}</p>`;
}

function updateUI() {
    updateParticipantsList();
    hasRevealed ? displayVotes() : votesDisplay.innerHTML = '';
    hasRevealed ? displayVoteSummary() : voteSummaryDiv.innerHTML = '';
    document.getElementById('control-buttons').classList.toggle('hidden', !isFacilitator);
    facilitatorDisplay.textContent = currentFacilitator ? `Facilitator: ${currentFacilitator}` : '';

    document.querySelectorAll('.card').forEach(card => {
        if (hasRevealed) {
            card.classList.add('revealed');
        } else {
            card.classList.remove('revealed');
            const val = card.querySelector('.back').textContent;
            card.classList.toggle('selected', val === myVote);
        }
    });
}

function revealVotes() {
    if (!hasRevealed && isFacilitator) socket.emit('revealVotes', { room: currentRoom });
}

function resetGame() {
    if (!isFacilitator) return;
    if (confirm("Are you sure you want to reset the game? This will clear all votes.")) {
        socket.emit('resetGame', { room: currentRoom });
    }
}

function shareRoom() {
    const roomUrl = `${window.location.origin}${window.location.pathname}?room=${currentRoom}`;
    navigator.clipboard.writeText(roomUrl).then(() => {
        copyFeedbackSpan.style.opacity = 1;
        setTimeout(() => copyFeedbackSpan.style.opacity = 0, 1500);
    });
}

function checkInputsAndProceed(roomName, username, emitEvent) {
    if (!roomName || !username) return alert('Room and name required');
    currentRoom = roomName;
    myUsername = username;
    localStorage.setItem('pokerUsername', myUsername);
    localStorage.setItem('pokerRoom', currentRoom);
    socket.emit(emitEvent, { room: currentRoom, username: myUsername });
    currentRoomNameSpan.textContent = currentRoom;
    roomSelectionDiv.style.display = 'none';
    gameAreaDiv.style.display = 'block';
    createCards();
    return true;
}

createRoomBtn.addEventListener('click', () => checkInputsAndProceed(createRoomNameInput.value.trim(), usernameInput.value.trim(), 'createRoom'));
joinRoomBtn.addEventListener('click', () => checkInputsAndProceed(joinRoomNameInput.value.trim(), usernameInput.value.trim(), 'joinRoom'));
shareBtn.addEventListener('click', shareRoom);
revealBtn.addEventListener('click', revealVotes);
resetBtn.addEventListener('click', resetGame);

darkModeToggle?.addEventListener('change', () => {
    const isDark = rootElement.classList.toggle('dark-theme');
    themeLabel.textContent = isDark ? 'Dark Mode' : 'Light Mode';
    localStorage.setItem('pokerTheme', isDark ? 'dark' : 'light');
});

(function initOnLoad() {
    const savedTheme = localStorage.getItem('pokerTheme');
    if (savedTheme === 'dark') {
        rootElement.classList.add('dark-theme');
        darkModeToggle.checked = true;
        themeLabel.textContent = 'Dark Mode';
    }

    const savedUsername = localStorage.getItem('pokerUsername');
    const savedRoom = localStorage.getItem('pokerRoom');
    const urlRoom = new URLSearchParams(window.location.search).get('room');

    if (savedUsername) usernameInput.value = savedUsername;
    if (urlRoom) joinRoomNameInput.value = urlRoom;

    const room = urlRoom || savedRoom;
    if (room && savedUsername) {
        currentRoom = room;
        myUsername = savedUsername;
        socket.emit('joinRoom', { room: currentRoom, username: myUsername });
        currentRoomNameSpan.textContent = currentRoom;
        roomSelectionDiv.style.display = 'none';
        gameAreaDiv.style.display = 'block';
        createCards();
    }
})();
