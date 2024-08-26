const socket = new WebSocket('ws://localhost:8080');
let currentPlayer = 'A';
let gameBoard = [];
const boardSize = 5;
let selectedPiece = null;
let placingPiece = false;

socket.onopen = () => {
    console.log('Connected to the server');
    initializeBoard();
};

socket.onmessage = (event) => {
    const message = JSON.parse(event.data);

    switch (message.type) {
        case 'update':
            gameBoard = message.state;
            renderBoard();
            updateTurnIndicator(message.currentPlayer);
            break;
        case 'invalid':
            displayMessage('Invalid move! Try again.');
            break;
        case 'game-over':
            displayMessage(`Game over! Player ${message.winner} wins!`);
            socket.close();
            break;
        default:
            console.log('Unknown message type:', message.type);
    }
};

const initializeBoard = () => {
    gameBoard = Array.from({ length: boardSize }, () => Array(boardSize).fill(null));
    renderBoard();
};

const renderBoard = () => {
    const boardElement = document.getElementById('game-board');
    boardElement.innerHTML = '';

    gameBoard.forEach((row, i) => {
        row.forEach((cell, j) => {
            const cellElement = document.createElement('div');
            cellElement.classList.add('cell');
            if (cell) {
                cellElement.classList.add(cell.player);
                cellElement.textContent = `${cell.player}-${cell.type}`;
            } else {
                cellElement.classList.add('empty');
            }
            cellElement.addEventListener('click', () => handleCellClick(i, j));
            boardElement.appendChild(cellElement);
        });
    });
};

const handleCellClick = (i, j) => {
    if (placingPiece) {
        placePieceOnBoard(i, j);
    } else if (selectedPiece) {
        socket.send(JSON.stringify({
            type: 'move',
            player: currentPlayer,
            from: selectedPiece.position,
            to: { i, j },
            move: 'M'
        }));
        selectedPiece = null;
    } else {
        const piece = gameBoard[i][j];
        if (piece && piece.player === currentPlayer) {
            selectedPiece = { ...piece, position: { i, j } };
            highlightValidMoves(piece.type, i, j);
        }
    }
};

const placePieceOnBoard = (i, j) => {
    if (!selectedPiece) {
        displayMessage('No piece selected for placement!');
        return;
    }

    if (gameBoard[i][j]) {
        displayMessage('Cell already occupied!');
        return;
    }

    gameBoard[i][j] = { player: currentPlayer, type: selectedPiece.type };
    selectedPiece = null;
    placingPiece = false;
    socket.send(JSON.stringify({
        type: 'place',
        player: currentPlayer,
        position: { i, j },
        piece: gameBoard[i][j].type
    }));
    renderBoard();
};

const highlightValidMoves = (type, i, j) => {
    const controlsElement = document.getElementById('controls');
    controlsElement.innerHTML = '';

    const moves = getValidMoves(type, i, j);
    moves.forEach(move => {
        const button = document.createElement('button');
        button.textContent = move.label;
        button.addEventListener('click', () => {
            const targetCell = gameBoard[move.to.i][move.to.j];
            if (targetCell && targetCell.player === currentPlayer) {
                displayMessage('Invalid move! You cannot move to a cell occupied by your own piece.');
                return;
            }
            socket.send(JSON.stringify({
                type: 'move',
                player: currentPlayer,
                from: { i, j },
                to: move.to,
                move: move.command
            }));
            selectedPiece = null;
        });
        controlsElement.appendChild(button);
    });
};

const getValidMoves = (type, i, j) => {
    const moves = [];
    if (type === 'Pawn') {
        if (currentPlayer === 'A') {
            if (i < boardSize - 1) moves.push({ label: 'Forward', command: 'F', to: { i: i + 1, j } });
            if (i > 0) moves.push({ label: 'Backward', command: 'B', to: { i: i - 1, j } });
        } else {
            if (i > 0) moves.push({ label: 'Forward', command: 'F', to: { i: i - 1, j } });
            if (i < boardSize - 1) moves.push({ label: 'Backward', command: 'B', to: { i: i + 1, j } });
        }
        if (j > 0) moves.push({ label: 'Left', command: 'L', to: { i, j: j - 1 } });
        if (j < boardSize - 1) moves.push({ label: 'Right', command: 'R', to: { i, j: j + 1 } });
    } else if (type === 'Hero1') {
        if (i > 1) moves.push({ label: 'Forward', command: 'F', to: { i: i - 2, j } });
        if (i < boardSize - 2) moves.push({ label: 'Backward', command: 'B', to: { i: i + 2, j } });
        if (j > 1) moves.push({ label: 'Left', command: 'L', to: { i, j: j - 2 } });
        if (j < boardSize - 2) moves.push({ label: 'Right', command: 'R', to: { i, j: j + 2 } });
    } else if (type === 'Hero2') {

        if (currentPlayer === 'A') {
            if (i > 1 && j > 1) moves.push({ label: 'Forward-Left', command: 'FL', to: { i: i - 2, j: j - 2 } });
            if (i > 1 && j < boardSize - 2) moves.push({ label: 'Forward-Right', command: 'FR', to: { i: i - 2, j: j + 2 } });
            if (i < boardSize - 2 && j > 1) moves.push({ label: 'Backward-Left', command: 'BL', to: { i: i + 2, j: j - 2 } });
            if (i < boardSize - 2 && j < boardSize - 2) moves.push({ label: 'Backward-Right', command: 'BR', to: { i: i + 2, j: j + 2 } });
        } else {
            if (i > 1 && j > 1) moves.push({ label: 'Forward-Left', command: 'FL', to: { i: i - 2, j: j - 2 } });
            if (i > 1 && j < boardSize - 2) moves.push({ label: 'Forward-Right', command: 'FR', to: { i: i - 2, j: j + 2 } });
            if (i < boardSize - 2 && j > 1) moves.push({ label: 'Backward-Left', command: 'BL', to: { i: i + 2, j: j - 2 } });
            if (i < boardSize - 2 && j < boardSize - 2) moves.push({ label: 'Backward-Right', command: 'BR', to: { i: i + 2, j: j + 2 } });
        }
    }
    return moves;
};

const updateTurnIndicator = (player) => {
    currentPlayer = player;
    document.getElementById('turn-indicator').textContent = `${currentPlayer === 'A' ? "Player A's" : "Player B's"} Turn`;
};

const displayMessage = (message) => {
    const messageElement = document.createElement('div');
    messageElement.textContent = message;
    messageElement.classList.add('message');
    document.getElementById('message').appendChild(messageElement);
    setTimeout(() => messageElement.remove(), 3000);
};

const placePiece = (type) => {
    selectedPiece = { type, position: null };
    placingPiece = true;
    displayMessage(`Select a cell to place your ${type}`);
};
