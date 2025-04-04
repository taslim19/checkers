const board = document.getElementById("board");

for (let row = 0; row < 8; row++) {
  for (let col = 0; col < 8; col++) {
    const tile = document.createElement("div");
    tile.classList.add("tile");

    // Checkerboard pattern
    if ((row + col) % 2 === 0) {
      tile.classList.add("light");
    } else {
      tile.classList.add("dark");

      // Add red pieces (top 3 rows)
      if (row < 3) {
        const piece = document.createElement("div");
        piece.classList.add("piece", "red");
        tile.appendChild(piece);
      }

      // Add black pieces (bottom 3 rows)
      if (row > 4) {
        const piece = document.createElement("div");
        piece.classList.add("piece", "black");
        tile.appendChild(piece);
      }
    }

    board.appendChild(tile);
  }
}
