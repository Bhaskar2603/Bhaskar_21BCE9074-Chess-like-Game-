const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });
let clients = [];
let gameState = [];
const boardSize = 5;
console.log("Server is running");

const initializeGame = () => {
    gameState = Array.from({ length: boardSize }, () => Array(boardSize).fill(null));

    gameState[0] = [
        { player: 'A', type: 'Pawn' }, 
        { player: 'A', type: 'Pawn' }, 
        { player: 'A', type: 'Hero1' }, 
        { player: 'A', type: 'Hero2' },
        { player: 'A', type: 'Pawn' }  
    ];
    
    gameState[boardSize - 1] = [
        { player: 'B', type: 'Pawn' }, 
        { player: 'B', type: 'Pawn' }, 
        { player: 'B', type: 'Hero1' },
        { player: 'B', type: 'Hero2' }, 
        { player: 'B', type: 'Pawn' }  
    ];

    broadcastGameState();
};

const broadcastGameState = (currentPlayer = 'A') => {
    clients.forEach(client => {
        client.send(JSON.stringify({
            type: 'update',
            state: gameState,
            currentPlayer
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
            const character = gameState[from.i][from.j];
            const targetCell = gameState[to.i][to.j];

            if (character && character.player === player && validateMove(from, to, character.type, player)) {
                if (targetCell && targetCell.player === player) {
                    ws.send(JSON.stringify({ type: 'invalid' }));
                    return;
                }
                gameState[from.i][from.j] = null;
                gameState[to.i][to.j] = { player, type: character.type };
                broadcastGameState(player === 'A' ? 'B' : 'A');

                const opponentRemaining = gameState.flat().some(c => c && c.player !== player);
                if (!opponentRemaining) {
                    clients.forEach(client => {
                        client.send(JSON.stringify({
                            type: 'game-over',
                            winner: player
                        }));
                    });
                    wss.close();
                }
            } else {
                ws.send(JSON.stringify({ type: 'invalid' }));
            }
        }
    });

    ws.on('close', () => {
        clients = clients.filter(client => client !== ws);
    });
});
