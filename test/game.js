
/**
 * Module dependencies.
 */

var Game = require('../game')
  , should = require('should')
  _ = require('lodash');


var playerCount = 0;
function generateMockPlayer() {
  return {
    id: ++playerCount
  }
}

function setupBoard(nInARow, board, params) {
  params = params || {};

  params = _.merge({
    nRows: board.length,
    nColumns: board[0].length,
    nInARow: nInARow,
  }, params);

  var game = new Game(params);

  _.eachRight(board, function(row) {
    _.each(row, function(ch, col) {
      if(ch !== ' ') game.board[col].push(ch);
    });
  });

  return game;
}

describe('Game', function() {
  var player1 = generateMockPlayer()
    , player2 = generateMockPlayer()
    , player3 = generateMockPlayer();

  describe('#constructor', function() {
    it('should create a game instance', function() {
      var game = new Game();

      game.should.be.ok;
    });
  });

  describe('#checkWinAt', function() {
    it('should have the correct coordinates in a win vector', function() {
      var game = setupBoard(3,
          [ 'X O',
            'XOX',
            'OXX']),
        win = game.checkWinAt(0, 0);

        should.exist(win);
        win.length.should.equal(3);
        win[0].length.should.equal(2);
        win[1].length.should.equal(2);
        win[2].length.should.equal(2);

        win[0][0].should.equal(0);
        win[0][1].should.equal(0);
        win[1][0].should.equal(1);
        win[1][1].should.equal(1);
        win[2][0].should.equal(2);
        win[2][1].should.equal(2);
    });

    it('should be able to identify all possible win vectors in any direction', function() {
      var board = [
            'OOOO',
            'XOXO',
            'OXOO'],
          game = setupBoard(3, board),
        winCount = 0;

      _.each(board, function(row, n) {
        _.each(row, function(ch, m) {
          if(ch === 'O' && game.checkWinAt(n, m)) winCount++;
        });
      });

      winCount.should.equal(8);
    });
  });

  describe('#move', function() {
    it('should not allow a move when player1 or 2 is not readied by leetcoin', function() {
      var board = [
          '   ',
          '   ',
          '   '],
        params = {
          player1: player1,
          player2: player2
        },
        game = setupBoard(2, board, params);

      game.move(player1.id, 0).should.not.be.ok;
    });

    it('should not allow a move when it is not player1 or 2\'s turn', function() {
      var board = [
          '   ',
          '   ',
          '   '],
        params = {
          player1: player1,
          player2: player2,
          player1leetcoinKey: 'player1leetcoinKey',
          player2leetcoinKey: 'player2leetcoinKey'
        },
        game = setupBoard(2, board, params);

      game.move(player1.id, 0).should.be.ok;
      game.move(player1.id, 0).should.not.be.ok;
      game.move(player2.id, 0).should.be.ok;
      game.move(player2.id, 0).should.not.be.ok;
    });

    it('should not allow a move by a player that is not in the match', function() {
      var board = [
          '   ',
          '   ',
          '   '],
        params = {
          player1: player1,
          player2: player2,
          player1leetcoinKey: 'player1leetcoinKey',
          player2leetcoinKey: 'player2leetcoinKey'
        },
        game = setupBoard(2, board, params);

      game.move(player3.id, 0).should.not.be.ok;
    });

    it('should not allow a move when the column chosen is invalid', function() {
      var board = [
          '   ',
          '   ',
          '   '],
        params = {
          player1: player1,
          player2: player2,
          player1leetcoinKey: 'player1leetcoinKey',
          player2leetcoinKey: 'player2leetcoinKey'
        },
        game = setupBoard(2, board, params);

      game.move(player1.id, -1).should.not.be.ok;
      game.move(player1.id, 3).should.not.be.ok;
    });

    it('should not allow a move when the game is over', function() {
      var board = [
          '   ',
          '   ',
          ' X '],
        params = {
          player1: player1,
          player2: player2,
          player1leetcoinKey: 'player1leetcoinKey',
          player2leetcoinKey: 'player2leetcoinKey'
        },
        game = setupBoard(2, board, params);

      game.move(player1.id, 0).should.be.ok;
      game.isGameOver().should.be.ok;
      game.move(player2.id, 0).should.not.be.ok;
    });


    it('should not allow a move when the column chosen is full', function() {
      var board = [
          'X  ',
          'X  ',
          'X  '],
        params = {
          player1: player1,
          player2: player2,
          player1leetcoinKey: 'player1leetcoinKey',
          player2leetcoinKey: 'player2leetcoinKey'
        },
        game = setupBoard(2, board, params);

      game.move(player1.id, 0).should.not.be.ok;
    });

    it('should allow a valid move', function() {
      var board = [
          '   ',
          '   ',
          ' X '],
        params = {
          player1: player1,
          player2: player2,
          player1leetcoinKey: 'player1leetcoinKey',
          player2leetcoinKey: 'player2leetcoinKey'
        },
        game = setupBoard(2, board, params);

      game.move(player1.id, 0).should.be.ok;
    });

    it('should say that the player has won after connecting a winning line', function() {
      var board = [
          '   ',
          '   ',
          ' X '],
        params = {
          player1: player1,
          player2: player2,
          player1leetcoinKey: 'player1leetcoinKey',
          player2leetcoinKey: 'player2leetcoinKey'
        },
        game = setupBoard(2, board, params);

      game.move(player1.id, 0).should.be.ok;
      game.isGameOver().should.be.ok;
      game.winner.should.equal(player1.id);
    });

    it('should not say that a player has won after not connecting a winning line', function() {
      var board = [
          '   ',
          '   ',
          '   '],
        params = {
          player1: player1,
          player2: player2,
          player1leetcoinKey: 'player1leetcoinKey',
          player2leetcoinKey: 'player2leetcoinKey'
        },
        game = setupBoard(2, board, params);

      game.move(player1.id, 0).should.be.ok;
      game.isGameOver().should.not.be.ok;
    });

    it('should say that the game is drawn after the board is filled and the last move was not a win', function() {
      var board = [
          '  ',
          'XO'],
        params = {
          player1: player1,
          player2: player2,
          player1leetcoinKey: 'player1leetcoinKey',
          player2leetcoinKey: 'player2leetcoinKey'
        },
        game = setupBoard(3, board, params);

      game.move(player1.id, 0).should.be.ok;
      game.move(player2.id, 1).should.be.ok;
      game.isGameOver().should.be.ok;
      game.draw.should.be.ok;
      should.not.exist(game.winner);
    });
  });

  describe('#checkFull', function() {
    it('should identify a full board as being full', function() {
      var board = [
          'OXO',
          'OXO',
          'XOX'],
        game = setupBoard(3, board);

      game.checkFull().should.be.ok;
    });

    it('should not identify a not full board as being full', function() {
      var board = [
          'OX ',
          'OXO',
          'XOX'],
        game = setupBoard(3, board);

      game.checkFull().should.not.be.ok;
    });
  });

  // Don't bother with these - #move tests cover this well enough
  describe.skip('#isGameOver', function() {
    it('should say the game is over when the game is drawn', function() {
      false.should.be.ok; // TODO
    });

    it('should say the game is over when a player wins', function() {
      false.should.be.ok; // TODO
    });

    it('should not say the game is over when no draw or winner exists', function() {
      false.should.be.ok; // TODO
    });
  });

  describe('#reset', function() {
    it('should say the game is not over when it is reset', function() {
      var board = [
          '   ',
          '   ',
          ' X '],
        params = {
          player1: player1,
          player2: player2,
          player1leetcoinKey: 'player1leetcoinKey',
          player2leetcoinKey: 'player2leetcoinKey'
        },
        game = setupBoard(2, board, params);

      game.move(player1.id, 0).should.be.ok;
      game.isGameOver().should.be.ok;
      game.reset();
      game.isGameOver().should.not.be.ok;
    });
  });
});