var _ = require('lodash');

function Game(params) {
  params = params || {};

  this.id = params.id;
  this.player1 = params.player1;
  this.player2 = params.player2;
  this.winner = null;

  this.player1PlayAgain = false;
  this.player2PlayAgain = false;

  this.match_key = params.matchKey;
  // this.server_key = params.key
  // this.server_api_key = params.apiKey
  // this.server_secret = params.apiSecret

  // We need to store the leetcoin userids
  // this.player1leetcoinKey = params.player1leetcoinKey;
  // this.player2leetcoinKey = params.player2leetcoinKey;

  this.nRows = params.nRows || 6;
  this.nColumns = params.nColumns || 7;
  this.nInARow = params.nInARow || 4;

  this.reset();
}

Game.prototype.reset = function() {
  var self = this;
  this.board = _.times(this.nColumns, function() {
    return [];
  });
  this.draw = false;
  this.turn = 'player1';
  this.winner = null;
  this.winVector = null;
  this.player1PlayAgain = this.player2PlayAgain = false;
}

Game.prototype.isGameOver = function() {
  return !!this.draw || !!this.winner;
}

Game.prototype.move = function(playerId, col) {
  if(this.isGameOver()                                                    // round already over
      || col < 0                                                          // out of bounds
      || col >= this.nColumns
      || (playerId !== this.player1.id && playerId !== this.player2.id)   // isn't an active player
      || playerId != this[this.turn].id                                   // not this player's turn
      // || !(this.player1leetcoinKey && this.player2leetcoinKey)            // both players have not yet been activated at leetcoin
      || this.board[col].length === this.nRows)                           // column is already full
    return false;  // invalid move

  var column = this.board[col];

  column.push(playerId === this.player1.id ? 'X' : 'O');

  var win = this.winVector = this.checkWinAt(column.length - 1, col);

  if(win) {
    var coord1 = win[0]
      , playerPiece = this.board[coord1[0]][coord1[1]];

    this.winner = playerPiece === 'X' ? this.player1.id : this.player2.id;
  }
  else {
    this.draw = this.checkFull();
    if(!this.draw) this.turn = this.turn === 'player1' ? 'player2' : 'player1';
  }

  return true;
}

/**
 *    Lower left corner is 0,0
 *    m == row
 *    n == column
 */
Game.prototype.checkWinAt = function(m, n) {
  var directions = [[1,1],[1,0],[1,-1],[0,1]]
    , nInARow = this.nInARow
    , nRows = this.nRows
    , nColumns = this.nColumns
    , board = this.board;

  for(var dindex in directions) {
    var direction = directions[dindex]
      , nextContent
      , lastContent
      , solution = []
      , i = 0
      , dn = direction[0]
      , dm = direction[1];

    // First back up to find the beginning of the connected chain behind me, if it's not me
    lastContent = board[n + i * dn][m + i * dm];
    nextContent = board[n + (i-1) * dn] && board[n + (i-1) * dn][m + (i-1) * dm];
    while(!!lastContent && lastContent === nextContent) {
      i--;
      lastContent = board[n + i * dn][m + i * dm];
      nextContent = board[n + (i-1) * dn] && board[n + (i-1) * dn][m + (i-1) * dm];
    }

    // Now go forward to get the max connected line in this direction
    do {
      lastContent = board[n + i * dn][m + i * dm];
      solution.push([n + i * dn, m + i * dm]);
      nextContent = board[n + (i+1) * dn] && board[n + (i+1) * dn][m + (i+1) * dm];
    } while(++i < nInARow && !!lastContent && lastContent === nextContent);

    if(solution.length === nInARow) return solution;
  }
}

Game.prototype.checkFull = function() {
  var nRows = this.nRows;
  return _.all(this.board, function(col) {
    return col.length === nRows;
  });
}

Game.prototype.wireSafe = function() {
  return {
    id: this.id,
    player1: this.player1 && this.player1.id,
    player2: this.player2 && this.player2.id,
    player1PlayAgain: this.player1PlayAgain,
    player2PlayAgain: this.player2PlayAgain,
    winner: this.winner,
    player1leetcoinKey: this.player1leetcoinKey,
    player2leetcoinKey: this.player2leetcoinKey,
    board: this.board,
    nRows: this.nRows,
    nColumns: this.nColumns,
    draw: this.draw,
    turn: this.turn,
    nInARow: this.nInARow,
    winVector: this.winVector
  };
}

module.exports = Game;