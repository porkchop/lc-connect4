var debug = require('debug')('connect4');
var express = require('express');
var http = require('http');
var path = require('path');
var logger = require('morgan');
var bodyParser = require('body-parser');
var passport = require('passport')
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
var partials = require('express-partials')
var socketio = require('socket.io');
var passportSocketIo = require("passport.socketio");
var db = require('./db');
var Leetcoin = require('leetcoin');
var config = require('./config');
var leetcoin = new Leetcoin(config.developer_shared_secret, config.developer_api_key, config.url, config.game_key);

// [BEGIN] Initialization
var app = express();
var server = http.createServer(app);
var io = socketio.listen(server);

// setup passport google auth strategy, since we are not storing users in a db, just pass along the google provided info as our user data
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

passport.use(new GoogleStrategy({
    clientID: config.GOOGLE_CLIENT_ID,
    clientSecret: config.GOOGLE_CLIENT_SECRET,
    callbackURL: config.myURL + '/auth/google/callback'
  },
  function(accessToken, refreshToken, profile, done) {
    var emailParts = profile.emails[0].value.split('@');
    var domain = emailParts[1];
    if(domain !== 'gmail.com') return done('leetcoin connect4 only works with a gmail login.')
    profile.id = emailParts[0];
    return done(null, profile);
  }
));

var sessionConfig = {
  secret: 'leetcoin connect4 super secret',
  key: 'express.sid',
  store: new express.session.MemoryStore()
};

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(express.cookieParser());
app.use(express.session(sessionConfig));
app.use(passport.initialize());
app.use(passport.session());
app.use(partials());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// set authorization for socket.io
io.set('authorization', passportSocketIo.authorize({
  cookieParser: express.cookieParser,
  key:         sessionConfig.key,       // the name of the cookie where express/connect stores its session_id
  secret:      sessionConfig.secret,    // the session_secret to parse the cookie
  store:       sessionConfig.store,        // we NEED to use a sessionstore. no memorystore please
  success:     function(data, accept){
    debug('successful connection to socket.io');
    accept(null, true);
  },
  fail:        function(data, message, error, accept){
    if(error)
      throw new Error(message);
    debug('failed connection to socket.io:', message);
    accept(null, false);
  }
}));

io.configure(function() {
  io.set('log level', 2);
});

app.set('port', config.port);
server.listen(app.get('port'), function() {
  debug('Express server listening on port ' + server.address().port);
});
// [END] Initialization


// [BEGIN] Routes
app.get('/auth/google', 
  passport.authenticate('google', { scope: ['https://www.googleapis.com/auth/userinfo.profile',
                                            'https://www.googleapis.com/auth/userinfo.email'] }),
  function(req, res) {
    res.redirect(req.session.originalUrl || '/');
  });

app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect(req.session.originalUrl || '/');
  });

app.get('/logout', function(req, res) {
  req.logout();
  res.redirect('/');
});

app.get('/', ensureAuthOpenID, createOrLoadGame, checkAuthzLeetcoin, function(req, res) {
  var game = req.game;
  res.render('index.ejs', {
    userId: req.user.id,
    game: game.wireSafe(),
    game_link: 'https://' + config.url + '/server/view/' + game.server_key
  });
});

app.get('/login', function(req, res) {
  res.render('login');
});
// [END] Routes


// [BEGIN] Middleware
function ensureAuthOpenID(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  req.session.originalUrl = req.originalUrl;
  res.redirect('/login')
}

function createOrLoadGame(req, res, next) {
  var gameId = req.query.g;
  var user = req.user;
  var game = db.games.get(gameId);

  if(!game) {
    gameId = user.displayName + Math.floor(Math.random() * 10000);
    var title = user.displayName + "'s game";
    var return_link = config.myURL + '/?g=' + gameId;
    leetcoin.serverCreate({
      title: title,
      hostAddress: config.myURL,
      hostPort: config.port,
      hostConnectionLink: return_link,
      maxActivePlayers: 3,
      maxAuthorizedPlayers: 3,
      minimumBTCHold: 1000,
      incrementBTC: 100,
      serverRakeBTCPercentage: 0.01,
      serverAdminUserKey: null,
      leetcoinRakePercentage: 0.01,
      allowNonAuthorizedPlayers: false,
      stakesClass: 'LOW',
      motdShowBanner: false,
      motdBannerColor: 'F00',
      motdBannerText: 'leetcoin-connect4'
    }, function(err, server) {
      if(err) return res.render('error.ejs', {error:  err});

      server.player1 = user;
      server.id = gameId;
      game = db.games.create(server);
      debug(server, game);

      initRealTimeChannel(game.id);

      loaded();
    });
  }
  else loaded();

  function loaded() {
    if(!game.player2 && game.player1.id != user.id) game.player2 = user;
    req.game = game;
    next();
  }
}

function checkAuthzLeetcoin(req, res, next) {
  var user = req.user;
  var game = req.game;

  var countDown = 10;
  function check() {
    leetcoin.activatePlayer(user.id, game.server_secret, game.server_api_key, function(err, resAP) {
      if(err) return res.render('error.ejs', {error:  err});
      if(!resAP.player_authorized) return --countDown > 0 && setTimeout(check, 10000);

      debug('player authorized');
      if(user.id === game.player1.id) game.player1leetcoinKey = resAP.player_platformid;
      else if(game.player2 && user.id === game.player2.id) game.player2leetcoinKey = resAP.player_platformid;
      
      io.of('/' + game.id).emit('game', game.wireSafe());
    });
  }
  check();

  next();
}
// [END] Middleware


// [BEGIN] Realtime updates
function initRealTimeChannel(channelId) {
  var channel = io.of('/' + channelId);
  var game = db.games.get(channelId);

  function removePlayer(playerKey) {
    leetcoin.deactivatePlayer(game, game[playerKey].id);
    game[playerKey] = null;
    game[playerKey + 'leetcoinKey'] = null;
    game[playerKey + 'PlayAgain'] = false;
  }

  channel.on('connection', function(socket) {
    var player = socket.handshake.user;

    channel.emit('game', game.wireSafe());
    
    socket.on('move', function(column) {
      if(game.move(player.id, column)) {
        if(game.isGameOver()) {
          var player_keys = [game.player1.id, game.player2.id]
            , player_names = [game.player1.id, game.player2.id]
            , weapons = ['Brain A', 'Brain B']
            , kills = [1,0]
            , deaths = [0,1]
            , ranks = [1601, 1599];

          if(game.winner === game.player2.id) {
            kills = [0,1];
            deaths = [1,0];
            ranks = [1599, 1601];
          }
          else if(game.draw) {
            kills = [0,0];
            deaths = [0,0];
            ranks = [1600, 1600];
          }

          leetcoin.setMatchResults(game, 'leetcoinconnect4', player_keys, player_names, weapons, kills, deaths, ranks, function(err, res) {
            if(err) console.error(err);
          });
        }
        channel.emit('game', game.wireSafe());
      }
    });

    socket.on('unregister', function() {
      if(game.winner || !(game.player1 && game.player2)) {
        if(game.player1.id == player.id) removePlayer('player1');
        else if(game.player2.id == player.id) removePlayer('player2');
        channel.emit('game', game.wireSafe());
      }
    });

    socket.on('playAgain', function() {
      if(!game.isGameOver()) return;    // can't play again if the current round hasn't completed

      if(game.player1.id == player.id) game.player1PlayAgain = true;
      else if(game.player2.id == player.id) game.player2PlayAgain = true;

      if(game.player1PlayAgain && game.player2PlayAgain) {
        game.player1PlayAgain = game.player2PlayAgain = false;
        game.reset();
      }

      channel.emit('game', game.wireSafe());
    });
  });
}
// [END] Realtime updates