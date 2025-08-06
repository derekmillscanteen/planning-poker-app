// Inside function checkInputsAndProceed (modified):
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

// Inside initOnLoad (modified):
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

    if (savedUsername) usernameInput.value = savedUsername;
    if (urlRoom) joinRoomNameInput.value = urlRoom;

    // Do not auto-join. Show the join/create screen always.
    roomSelectionDiv.style.display = 'block';
    gameAreaDiv.style.display = 'none';
})();
