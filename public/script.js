// --- Get references to our HTML elements ---
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

// Dark Mode Elements
const darkModeToggle = document.getElementById('dark-mode-toggle');
const rootElement = document.documentElement;
const themeLabel = document.querySelector('.theme-label');

// --- Define our app's state variables ---
const cardValues = ['1', '2', '3', '5', '8', '13', '21', '?'];
let currentRoom = '';
let myVote = null;
let myUsername = 'Anonymous';
let isFacilitator = false;
let allVotes = {};
let hasRevealed = false;
let currentFacilitator = '';

// This tells the browser to explicitly connect to the current host
const socket = io(window.location.origin);

socket.on('connect', () => {
    console.log('Successfully connected to the server!');
});

socket.on('connect_error', (err) => {
    console.error('Failed to connect to the server:', err);
});
socket.on('updateState', (state) => {
    allVotes = state.votes;
    hasRevealed = state.revealed;
    isFacilitator = (state.facilitator === myUsername);
    currentFacilitator = state.facilitator;
    updateUI();
});

// --- UI-related functions ---
function createCards() {
    cardsContainer.innerHTML = '';
    cardValues.forEach(value => {
        const cardDiv = document.createElement('div');
        cardDiv.classList.add('card');
        cardDiv.textContent = value;
        cardDiv.addEventListener('click', () => selectCard(cardDiv, value));
        cardsContainer.appendChild(cardDiv);
    });
}

function selectCard(selectedCard, value) {
    if (hasRevealed) {
        return;
    }
    
    myVote = value;
    // THIS IS THE FIX. We update the UI immediately for instant feedback.
    updateUI(); 
    socket.emit('vote', { room: currentRoom, username: myUsername, vote: myVote });
}

function displayVotes() {
    votesDisplay.innerHTML = '';
    const participants = Object.keys(allVotes);
    participants.forEach(user => {
        const voteCard = document.createElement('div');
        voteCard.classList.add('vote-card');
        voteCard.textContent = allVotes[user] || '?';
        votesDisplay.appendChild(voteCard);
    });
}

function updateParticipantsList() {
    participantsListDiv.innerHTML = '';
    const participants = Object.keys(allVotes);

    if (participants.length === 0) {
        participantsListDiv.textContent = 'No participants yet...';
        return;
    }

    participants.forEach(user => {
        const participantSpan = document.createElement('span');
        participantSpan.classList.add('participant');
        participantSpan.textContent = user;
        
        if (allVotes[user] === null) {
            const loaderSpan = document.createElement('span');
            loaderSpan.classList.add('loader');
            participantSpan.appendChild(loaderSpan);
        } else if (allVotes[user]) {
            participantSpan.classList.add('has-voted');
        }

        participantsListDiv.appendChild(participantSpan);
    });
}

function displayVoteSummary() {
    voteSummaryDiv.innerHTML = '';
    const validVotes = Object.values(allVotes)
        .filter(vote => !isNaN(parseInt(vote)))
        .map(vote => parseInt(vote));

    if (validVotes.length === 0) {
        return;
    }

    const sum = validVotes.reduce((acc, curr) => acc + curr, 0);
    const average = (sum / validVotes.length).toFixed(1);

    validVotes.sort((a, b) => a - b);
    let median;
    const mid = Math.floor(validVotes.length / 2);
    if (validVotes.length % 2 === 0) {
        median = (validVotes[mid - 1] + validVotes[mid]) / 2;
    } else {
        median = validVotes[mid];
    }
    
    voteSummaryDiv.innerHTML = `
        <p><strong>Average:</strong> ${average}</p>
        <p><strong>Median:</strong> ${median}</p>
    `;
}

function updateUI() {
    updateParticipantsList();

    if (hasRevealed) {
        displayVotes();
        displayVoteSummary();
    } else {
        votesDisplay.innerHTML = '';
        voteSummaryDiv.innerHTML = '';
    }

    if (isFacilitator) {
        document.getElementById('control-buttons').classList.remove('hidden');
    } else {
        document.getElementById('control-buttons').classList.add('hidden');
    }

    if (currentFacilitator) {
        facilitatorDisplay.textContent = `Facilitator: ${currentFacilitator}`;
    } else {
        facilitatorDisplay.textContent = '';
    }
    
    const allCards = document.querySelectorAll('.card');
    allCards.forEach(card => {
        card.classList.remove('selected');
        if (hasRevealed) {
            card.classList.add('revealed');
        } else {
            card.classList.remove('revealed');
            if (myVote !== null && card.textContent === myVote) {
                card.classList.add('selected');
            }
        }
    });
}

// --- Game control functions ---
function revealVotes() {
    if (hasRevealed || !isFacilitator) {
        return;
    }
    socket.emit('revealVotes', { room: currentRoom });
}

function resetGame() {
    if (!isFacilitator) {
        return;
    }

    const confirmed = confirm("Are you sure you want to reset the game? This will clear all votes.");

    if (confirmed) {
        socket.emit('resetGame', { room: currentRoom });
    }
}

function shareRoom() {
    const roomUrl = `${window.location.origin}${window.location.pathname}?room=${currentRoom}`;
    navigator.clipboard.writeText(roomUrl).then(() => {
        copyFeedbackSpan.style.opacity = 1;
        setTimeout(() => {
            copyFeedbackSpan.style.opacity = 0;
        }, 1500);
    }).catch(err => {
        console.error('Failed to copy text: ', err);
    });
}

function checkInputsAndProceed(roomName, username, emitEvent) {
    if (!roomName) {
        alert('Please enter a room name.');
        return false;
    }
    if (!username) {
        alert('Please enter your name.');
        return false;
    }
    currentRoom = roomName;
    myUsername = username;
    
    saveUsername(myUsername);

    socket.emit(emitEvent, { room: currentRoom, username: myUsername });
    
    currentRoomNameSpan.textContent = currentRoom;
    roomSelectionDiv.style.display = 'none';
    gameAreaDiv.style.display = 'block';
    createCards();

    return true;
}

// --- Event Listeners for our buttons ---
createRoomBtn.addEventListener('click', () => {
    const roomName = createRoomNameInput.value.trim();
    const username = usernameInput.value.trim();
    checkInputsAndProceed(roomName, username, 'createRoom');
});

joinRoomBtn.addEventListener('click', () => {
    const roomName = joinRoomNameInput.value.trim();
    const username = usernameInput.value.trim();
    checkInputsAndProceed(roomName, username, 'joinRoom');
});

shareBtn.addEventListener('click', shareRoom);
revealBtn.addEventListener('click', revealVotes);
resetBtn.addEventListener('click', resetGame);

// --- Dark Mode Logic ---
function toggleTheme() {
    const isDarkMode = rootElement.classList.toggle('dark-theme');
    localStorage.setItem('pokerTheme', isDarkMode ? 'dark' : 'light');
    themeLabel.textContent = isDarkMode ? 'Dark Mode' : 'Light Mode';
}

function loadTheme() {
    const savedTheme = localStorage.getItem('pokerTheme');
    const isDarkMode = savedTheme === 'dark';
    rootElement.classList.toggle('dark-theme', isDarkMode);
    darkModeToggle.checked = isDarkMode;
    themeLabel.textContent = isDarkMode ? 'Dark Mode' : 'Light Mode';
}

// Add event listener to the toggle switch
if (darkModeToggle) {
    darkModeToggle.addEventListener('change', toggleTheme);
}

// --- New code to handle URL and localStorage ---
function saveUsername(username) {
    try {
        localStorage.setItem('pokerUsername', username);
    } catch (e) {
        console.error('Error saving username to localStorage:', e);
    }
}

function loadUsername() {
    try {
        const savedUsername = localStorage.getItem('pokerUsername');
        if (savedUsername) {
            usernameInput.value = savedUsername;
        }
    } catch (e) {
        console.error('Error loading username from localStorage:', e);
    }
}

function checkUrlForRoomName() {
    const urlParams = new URLSearchParams(window.location.search);
    const roomNameFromUrl = urlParams.get('room');

    if (roomNameFromUrl) {
        joinRoomNameInput.value = roomNameFromUrl;
    }
}

// Run these functions when the page loads
loadUsername();
checkUrlForRoomName();
loadTheme();