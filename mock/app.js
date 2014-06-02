
/**
 * This runs the application while mocking the leetcoin API for quick game UI dev without needing to be really connected live to leetcoin
 */


var noop = function() {};

function MockLeetcoin() {
  console.warn('Running mock leetcoin API!!!');
}

MockLeetcoin.prototype.serverCreate = function(params, cb) {
  cb = cb || noop;

  console.log('Mock serverCreate')

  cb(null, {});
}

MockLeetcoin.prototype.activatePlayer = function(platformid, server_secret, server_api_key, cb) {
  cb = cb || noop;
  
  console.log('Mock activatePlayer')

  cb(null, {
    player_authorized: true,
    player_platformid: platformid
  });
}

MockLeetcoin.prototype.deactivatePlayer = function(game, platformid, cb) {
  cb = cb || noop;

  console.log('Mock deactivatePlayer')
  
  cb();
}

MockLeetcoin.prototype.setMatchResults = function(game, map_title, player_keys, player_names, weapons, kills, deaths, ranks, cb) {
  cb = cb || noop;

  console.log('Mock setMatchResults')
  
  cb();
}


var proxyquire = require('proxyquire');

proxyquire('../app', {
  'leetcoin': MockLeetcoin
});
