(function () {
  const params = new URLSearchParams(location.search);
  const payload = params.get('payload');
  const sig = params.get('sig');

  const boardEl = document.getElementById('board');
  const statusEl = document.getElementById('status');
  const restartBtn = document.getElementById('restart');
  const submitBtn = document.getElementById('submitScore');

  const X = 'X';
  const O = 'O';
  let board = Array(9).fill('');
  let gameOver = false;
  let playerWon = false;

  function draw() {
    boardEl.innerHTML = '';
    for (let i = 0; i < 9; i++) {
      const cell = document.createElement('div');
      cell.className = 'cell' + (gameOver ? ' disabled' : '');
      cell.textContent = board[i];
      cell.addEventListener('click', () => onCellClick(i));
      boardEl.appendChild(cell);
    }
  }

  function onCellClick(i) {
    if (gameOver || board[i]) return;
    board[i] = X;
    const winner = checkWinner();
    if (winner || isFull()) {
      endGame(winner === X ? 'You win!' : winner === O ? 'You lose!' : 'Draw');
      return;
    }
    statusEl.textContent = "AI's turn (O)";
    setTimeout(aiMove, 250);
    draw();
  }

  function aiMove() {
    // Very naive AI: win if possible, block if needed, else random
    const idx = findBestMove();
    if (idx != null) {
      board[idx] = O;
    }
    const winner = checkWinner();
    draw();
    if (winner || isFull()) {
      endGame(winner === X ? 'You win!' : winner === O ? 'You lose!' : 'Draw');
    } else {
      statusEl.textContent = 'Your turn (X)';
    }
  }

  function lines() {
    return [
      [0,1,2],[3,4,5],[6,7,8],
      [0,3,6],[1,4,7],[2,5,8],
      [0,4,8],[2,4,6]
    ];
  }

  function checkWinner() {
    for (const [a,b,c] of lines()) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
    }
    return null;
  }

  function isFull() { return board.every(v => v); }

  function findBestMove() {
    // Try to win
    for (const [a,b,c] of lines()) {
      const line = [board[a], board[b], board[c]];
      if (line.filter(v => v === O).length === 2 && line.includes('')) return [a,b,c][line.indexOf('')];
    }
    // Block
    for (const [a,b,c] of lines()) {
      const line = [board[a], board[b], board[c]];
      if (line.filter(v => v === X).length === 2 && line.includes('')) return [a,b,c][line.indexOf('')];
    }
    // Take center, corner, random
    if (!board[4]) return 4;
    const choices = [0,2,6,8,1,3,5,7].filter(i => !board[i]);
    return choices[Math.floor(Math.random() * choices.length)] ?? null;
  }

  function endGame(message) {
    gameOver = true;
    playerWon = message.startsWith('You win');
    statusEl.textContent = message;
    submitBtn.disabled = !playerWon;
  }

  function reset() {
    board = Array(9).fill('');
    gameOver = false;
    playerWon = false;
    statusEl.textContent = 'Your turn (X)';
    submitBtn.disabled = true;
    draw();
  }

  async function submitScore() {
    if (!payload || !sig) return alert('Missing payload');
    try {
      const res = await fetch('/api/set_score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload, sig, score: 1 }) // 1 point for a win
      });
      const data = await res.json();
      if (data.ok) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Score submitted';
      } else {
        alert('Failed to submit score: ' + (data.error || 'unknown'));
      }
    } catch (e) {
      alert('Network error');
    }
  }

  restartBtn.addEventListener('click', reset);
  submitBtn.addEventListener('click', submitScore);

  reset();
})();