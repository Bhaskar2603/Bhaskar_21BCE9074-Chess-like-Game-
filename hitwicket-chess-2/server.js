const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });
let clients = [];
let gameState = [];
const boardSize = 5;
let currentPlayer = 'A';

console.log("Server is running");

const initializeGame = () => {
    gameState = Array.from({ length: boardSize }, () => Array(boardSize).fill(null));
    broadcastGameState();
};

const broadcastGameState = (player = 'A') => {
    clients.forEach(client => {
        client.send(JSON.stringify({
            type: 'update',
            state: gameState,
            currentPlayer: player
        }));
    });
};

const validateMove = (from, to, type, player) => {
   
    const deltaI = to.i - from.i;
    const deltaJ = to.j - from.j;

    switch (type) {
        case 'Pawn':
            return Math.abs(deltaI) <= 1 && Math.abs(deltaJ) <= 1 && (deltaI !== 0 || deltaJ !== 0);
        case 'Hero1':
            return (Math.abs(deltaI) === 2 && deltaJ === 0) || (Math.abs(deltaJ) === 2 && deltaI === 0);
        case 'Hero2':
            return Math.abs(deltaI) === 2 && Math.abs(deltaJ) === 2;
        default:
            return false;
    }
};

wss.on('connection', (ws) => {
    clients.push(ws);
    if (clients.length === 2) {
        initializeGame();
    }

    ws.on('message', (message) => {
        const msg = JSON.parse(message);

        if (msg.type === 'move') {
            const { from, to, move, player } = msg;
            const piece = gameState[from.i][from.j];
            const targetCell = gameState[to.i][to.j];

            if (piece && piece.player === player && validateMove(from, to, piece.type, player)) {
                if (targetCell && targetCell.player === player) {
                    ws.send(JSON.stringify({ type: 'invalid' }));
                    return;
                }
                gameState[from.i][from.j] = null;
                gameState[to.i][to.j] = { player, type: piece.type };
                currentPlayer = (currentPlayer === 'A') ? 'B' : 'A';
                broadcastGameState(currentPlayer);
            } else {
                ws.send(JSON.stringify({ type: 'invalid' }));
            }
        } else if (msg.type === 'place') {
            const { player, position, piece } = msg;

            if (gameState[position.i][position.j]) {
                ws.send(JSON.stringify({ type: 'invalid' }));
                return;
            }

            if (player === currentPlayer) {
                gameState[position.i][position.j] = { player, type: piece };
                currentPlayer = (currentPlayer === 'A') ? 'B' : 'A';
                broadcastGameState(currentPlayer);
            }
        }
    });

    ws.on('close', () => {
        clients = clients.filter(client => client !== ws);
    });
});
