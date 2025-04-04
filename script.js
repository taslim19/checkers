// Initialize Telegram Web App
const tg = window.Telegram.WebApp;
tg.expand();

class CheckersGame {
    constructor() {
        this.board = [];
        this.currentPlayer = 'white';
        this.selectedPiece = null;
        this.validMoves = [];
        this.gameOver = false;
        this.isBotGame = false;
        this.isMultiplayer = false;
        this.gameId = null;
        this.playerColor = null;
        
        // Check if there's a game ID in the URL
        const urlParams = new URLSearchParams(window.location.search);
        const gameId = urlParams.get('game');
        
        if (gameId) {
            this.joinGame(gameId);
        } else {
            this.setupEventListeners();
            this.showGameModeSelection();
        }
    }

    showGameModeSelection() {
        document.getElementById('game-mode').classList.remove('hidden');
        document.getElementById('board').classList.add('hidden');
        document.getElementById('restart-btn').classList.add('hidden');
        document.getElementById('game-link').classList.add('hidden');
    }

    setupEventListeners() {
        document.getElementById('play-bot').addEventListener('click', () => {
            this.isBotGame = true;
            this.isMultiplayer = false;
            this.startNewGame();
        });

        document.getElementById('play-friend').addEventListener('click', () => {
            this.isBotGame = false;
            this.isMultiplayer = true;
            this.startNewGame();
            this.generateGameLink();
        });

        document.getElementById('restart-btn').addEventListener('click', () => {
            this.startNewGame();
        });

        document.getElementById('copy-link').addEventListener('click', () => {
            const linkInput = document.getElementById('share-link');
            linkInput.select();
            document.execCommand('copy');
            tg.showAlert('Link copied to clipboard!');
        });

        const board = document.getElementById('board');
        board.addEventListener('click', (e) => {
            const square = e.target.closest('.square');
            if (!square) return;

            const row = parseInt(square.dataset.row);
            const col = parseInt(square.dataset.col);

            this.handleSquareClick(row, col);
        });
    }

    joinGame(gameId) {
        this.gameId = gameId;
        this.isMultiplayer = true;
        this.playerColor = 'black'; // Second player is always black
        this.setupEventListeners();
        this.startNewGame();
        
        // Send join game event through Telegram WebApp
        tg.CloudStorage.setItem(`game_${gameId}_joined`, 'true')
            .then(() => {
                this.initializeMultiplayerGame();
            })
            .catch(error => {
                tg.showAlert('Failed to join game. Please try again.');
            });
    }

    initializeMultiplayerGame() {
        document.getElementById('game-mode').classList.add('hidden');
        document.getElementById('board').classList.remove('hidden');
        document.getElementById('restart-btn').classList.remove('hidden');
        
        // Set up CloudStorage listener for game state updates
        this.setupCloudStorageListener();
    }

    setupCloudStorageListener() {
        // Poll for updates every second
        setInterval(() => {
            if (this.gameId) {
                tg.CloudStorage.getItem(`game_${this.gameId}_state`)
                    .then(state => {
                        if (state) {
                            const gameState = JSON.parse(state);
                            this.updateGameState(gameState);
                        }
                    });
            }
        }, 1000);
    }

    updateGameState(gameState) {
        if (!gameState) return;
        
        this.board = gameState.board;
        this.currentPlayer = gameState.currentPlayer;
        this.gameOver = gameState.gameOver;
        
        this.renderBoard();
        
        if (this.gameOver) {
            const winner = this.currentPlayer === 'white' ? 'Black' : 'White';
            document.getElementById('game-status').textContent = `Game Over! ${winner} wins!`;
        }
    }

    startNewGame() {
        document.getElementById('game-mode').classList.add('hidden');
        document.getElementById('board').classList.remove('hidden');
        document.getElementById('restart-btn').classList.remove('hidden');
        
        this.board = [];
        this.currentPlayer = 'white';
        this.selectedPiece = null;
        this.validMoves = [];
        this.gameOver = false;
        this.initializeBoard();
        this.renderBoard();

        if (this.isMultiplayer) {
            // Save initial game state
            this.saveGameState();
        } else if (this.isBotGame && this.currentPlayer === 'white') {
            this.makeBotMove();
        }
    }

    generateGameLink() {
        this.gameId = Math.random().toString(36).substring(2, 15);
        this.playerColor = 'white'; // First player is always white
        
        const gameLink = `${window.location.origin}${window.location.pathname}?game=${this.gameId}`;
        document.getElementById('share-link').value = gameLink;
        document.getElementById('game-link').classList.remove('hidden');
        
        // Initialize game state in CloudStorage
        this.saveGameState();
    }

    saveGameState() {
        if (!this.gameId) return;

        const gameState = {
            board: this.board,
            currentPlayer: this.currentPlayer,
            gameOver: this.gameOver
        };

        tg.CloudStorage.setItem(`game_${this.gameId}_state`, JSON.stringify(gameState))
            .catch(error => {
                tg.showAlert('Failed to save game state. Please try again.');
            });
    }

    initializeBoard() {
        // Create empty 8x8 board
        for (let i = 0; i < 8; i++) {
            this.board[i] = new Array(8).fill(null);
        }

        // Place white pieces (top)
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 8; col++) {
                if ((row + col) % 2 === 1) {
                    this.board[row][col] = { color: 'white', isKing: false };
                }
            }
        }

        // Place black pieces (bottom)
        for (let row = 5; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if ((row + col) % 2 === 1) {
                    this.board[row][col] = { color: 'black', isKing: false };
                }
            }
        }
    }

    renderBoard() {
        const boardElement = document.getElementById('board');
        boardElement.innerHTML = '';

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const square = document.createElement('div');
                square.className = `square ${(row + col) % 2 === 1 ? 'black' : ''}`;
                square.dataset.row = row;
                square.dataset.col = col;

                const piece = this.board[row][col];
                if (piece) {
                    const pieceElement = document.createElement('div');
                    pieceElement.className = `piece ${piece.color} ${piece.isKing ? 'king' : ''}`;
                    square.appendChild(pieceElement);
                }

                boardElement.appendChild(square);
            }
        }

        document.getElementById('current-player').textContent = 
            `Current Player: ${this.currentPlayer}${this.isBotGame && this.currentPlayer === 'white' ? ' (Bot)' : ''}`;
    }

    handleSquareClick(row, col) {
        if (this.gameOver) return;
        if (this.isBotGame && this.currentPlayer === 'white') return;
        if (this.isMultiplayer && this.currentPlayer !== this.playerColor) return;

        const piece = this.board[row][col];

        // If a piece is selected and we click on a valid move
        if (this.selectedPiece && this.validMoves.some(move => move.row === row && move.col === col)) {
            this.movePiece(this.selectedPiece.row, this.selectedPiece.col, row, col);
            if (this.isBotGame && !this.gameOver) {
                setTimeout(() => this.makeBotMove(), 500);
            } else if (this.isMultiplayer) {
                this.saveGameState();
            }
            return;
        }

        // If clicking on a piece of the current player
        if (piece && piece.color === this.currentPlayer) {
            this.selectedPiece = { row, col, ...piece };
            this.validMoves = this.getValidMoves(row, col);
            this.highlightValidMoves();
            return;
        }

        // Deselect if clicking elsewhere
        this.selectedPiece = null;
        this.validMoves = [];
        this.renderBoard();
    }

    makeBotMove() {
        if (this.gameOver || this.currentPlayer !== 'white') return;

        // Find all possible moves for white pieces
        const allMoves = [];
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.color === 'white') {
                    const moves = this.getValidMoves(row, col);
                    moves.forEach(move => {
                        allMoves.push({
                            from: { row, col },
                            to: { row: move.row, col: move.col },
                            isJump: move.isJump
                        });
                    });
                }
            }
        }

        if (allMoves.length === 0) return;

        // Prioritize jumps
        const jumps = allMoves.filter(move => move.isJump);
        const movesToConsider = jumps.length > 0 ? jumps : allMoves;

        // Randomly select a move
        const randomMove = movesToConsider[Math.floor(Math.random() * movesToConsider.length)];
        
        // Make the move
        this.movePiece(randomMove.from.row, randomMove.from.col, randomMove.to.row, randomMove.to.col);
    }

    getValidMoves(row, col) {
        const piece = this.board[row][col];
        if (!piece) return [];

        const moves = [];
        const directions = piece.isKing ? 
            [[-1, -1], [-1, 1], [1, -1], [1, 1]] :
            piece.color === 'white' ? [[1, -1], [1, 1]] : [[-1, -1], [-1, 1]];

        for (const [dr, dc] of directions) {
            const newRow = row + dr;
            const newCol = col + dc;

            if (this.isValidPosition(newRow, newCol)) {
                if (!this.board[newRow][newCol]) {
                    moves.push({ row: newRow, col: newCol, isJump: false });
                } else if (this.board[newRow][newCol].color !== piece.color) {
                    const jumpRow = newRow + dr;
                    const jumpCol = newCol + dc;
                    if (this.isValidPosition(jumpRow, jumpCol) && !this.board[jumpRow][jumpCol]) {
                        moves.push({ row: jumpRow, col: jumpCol, isJump: true });
                    }
                }
            }
        }

        return moves;
    }

    isValidPosition(row, col) {
        return row >= 0 && row < 8 && col >= 0 && col < 8;
    }

    highlightValidMoves() {
        this.renderBoard();
        this.validMoves.forEach(move => {
            const square = document.querySelector(`.square[data-row="${move.row}"][data-col="${move.col}"]`);
            if (square) {
                square.style.backgroundColor = '#aaffaa';
            }
        });

        if (this.selectedPiece) {
            const selectedSquare = document.querySelector(
                `.square[data-row="${this.selectedPiece.row}"][data-col="${this.selectedPiece.col}"]`
            );
            if (selectedSquare) {
                selectedSquare.querySelector('.piece').classList.add('selected');
            }
        }
    }

    movePiece(fromRow, fromCol, toRow, toCol) {
        const piece = this.board[fromRow][fromCol];
        this.board[fromRow][fromCol] = null;
        this.board[toRow][toCol] = piece;

        // Check if piece should be kinged
        if ((piece.color === 'white' && toRow === 7) || (piece.color === 'black' && toRow === 0)) {
            piece.isKing = true;
        }

        // Check for jumps
        const move = this.validMoves.find(m => m.row === toRow && m.col === toCol);
        if (move && move.isJump) {
            const jumpedRow = (fromRow + toRow) / 2;
            const jumpedCol = (fromCol + toCol) / 2;
            this.board[jumpedRow][jumpedCol] = null;
        }

        // Switch players
        this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';
        this.selectedPiece = null;
        this.validMoves = [];

        // Check for game over
        if (this.isGameOver()) {
            this.gameOver = true;
            const winner = this.currentPlayer === 'white' ? 'Black' : 'White';
            document.getElementById('game-status').textContent = `Game Over! ${winner} wins!`;
        }

        this.renderBoard();
    }

    isGameOver() {
        let whitePieces = 0;
        let blackPieces = 0;

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece) {
                    if (piece.color === 'white') whitePieces++;
                    else blackPieces++;
                }
            }
        }

        return whitePieces === 0 || blackPieces === 0;
    }
}

// Initialize the game when the page loads
window.addEventListener('load', () => {
    new CheckersGame();
});
