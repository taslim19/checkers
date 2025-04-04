// Initialize Telegram Web App
const tg = window.Telegram.WebApp;
tg.expand();

class CheckersGame {
    constructor() {
        this.board = [];
        this.currentPlayer = 'red';
        this.selectedPiece = null;
        this.validMoves = [];
        this.gameOver = false;
        this.initializeBoard();
        this.renderBoard();
        this.setupEventListeners();
    }

    initializeBoard() {
        // Create empty 8x8 board
        for (let i = 0; i < 8; i++) {
            this.board[i] = new Array(8).fill(null);
        }

        // Place red pieces (top)
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 8; col++) {
                if ((row + col) % 2 === 1) {
                    this.board[row][col] = { color: 'red', isKing: false };
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

        document.getElementById('current-player').textContent = `Current Player: ${this.currentPlayer}`;
    }

    setupEventListeners() {
        const board = document.getElementById('board');
        board.addEventListener('click', (e) => {
            const square = e.target.closest('.square');
            if (!square) return;

            const row = parseInt(square.dataset.row);
            const col = parseInt(square.dataset.col);

            this.handleSquareClick(row, col);
        });

        document.getElementById('restart-btn').addEventListener('click', () => {
            this.initializeBoard();
            this.currentPlayer = 'red';
            this.selectedPiece = null;
            this.validMoves = [];
            this.gameOver = false;
            this.renderBoard();
        });
    }

    handleSquareClick(row, col) {
        if (this.gameOver) return;

        const piece = this.board[row][col];

        // If a piece is selected and we click on a valid move
        if (this.selectedPiece && this.validMoves.some(move => move.row === row && move.col === col)) {
            this.movePiece(this.selectedPiece.row, this.selectedPiece.col, row, col);
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

    getValidMoves(row, col) {
        const piece = this.board[row][col];
        if (!piece) return [];

        const moves = [];
        const directions = piece.isKing ? 
            [[-1, -1], [-1, 1], [1, -1], [1, 1]] :
            piece.color === 'red' ? [[1, -1], [1, 1]] : [[-1, -1], [-1, 1]];

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
        if ((piece.color === 'red' && toRow === 7) || (piece.color === 'black' && toRow === 0)) {
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
        this.currentPlayer = this.currentPlayer === 'red' ? 'black' : 'red';
        this.selectedPiece = null;
        this.validMoves = [];

        // Check for game over
        if (this.isGameOver()) {
            this.gameOver = true;
            const winner = this.currentPlayer === 'red' ? 'Black' : 'Red';
            document.getElementById('game-status').textContent = `Game Over! ${winner} wins!`;
        }

        this.renderBoard();
    }

    isGameOver() {
        let redPieces = 0;
        let blackPieces = 0;

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece) {
                    if (piece.color === 'red') redPieces++;
                    else blackPieces++;
                }
            }
        }

        return redPieces === 0 || blackPieces === 0;
    }
}

// Initialize the game when the page loads
window.addEventListener('load', () => {
    new CheckersGame();
});
