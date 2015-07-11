var io = require('socket.io-client'),
    http = require('http'),
    winston = require('winston'),
    request = require('request'),
    configLoader = require('eu-node-config'),
    http = require("http"),
    Q = require('q');

  var config;
configLoader.loadConfig({
  email: {
    required: true
  },
  password: {required: true},
  name: {required: true},
  serveApi: {default: true},
  apiPort: {default: 3004},
  logLevel: {},
}).then(function(conf) {
  config = conf;
  winston.level = config.logLevel ? config.logLevel : 'info';
  return conf;
}).then(login)
.then(serveApi)
.then(function() {
  var wsConnection = "http://www-cdn-twitch.saltybet.com:1337";
  var sock = io.connect(wsConnection);

  sock.on('connect_error', function(err) {
    winston.error("Error connecting", err);
  });
  sock.on('connect', function() {
    winston.info("Wobsocket connected");
  });

  sock.on('disconnect', function() {
    winston.error("wobsocket disconnected");
  });

  sock.on("message", function(data) {
    updateState();
  });
})
.fail(function(err) {
  winston.error(err);
});



var request = request.defaults({jar: true});

var mySaltyBucks = null;
var baseLine = null;

function login(config) {
  return Q.Promise(function(resolve, reject, no) {
    request.post({
      url: 'http://www.saltybet.com/authenticate?signin=1', 
      form: {email: config.email, pword: config.password, authenticate: "signin"},
    }, function(err, resp, body) {
      if(err) {
        reject("Could not signin: " + err);
        return;
      }
      winston.info("Signed in");
      updateState();
      resolve();
    });
  });
}

function log2(val) {
  return Math.log(val) / Math.log(2);
}

function setBaseAmount() {
  var possible = Math.pow(2, Math.floor(log2(mySaltyBucks)));
  if(possible > baseLine) baseLine = possible;
}

function getAmount() {
  /* It is only probablistically favourable to bet 1 at complete random
     Betting a larger amount without pre-knowledge ensures you lose to all
     the other people who do have pre-knowledge. More investigation will have to be done
   */
  return 1;
  /* The below is a 'safe' amount to bet if you're somewhat sure of the outcome. */
  /* if(mySaltyBucks <= baseLine) return 1;
  return Math.floor(Math.sqrt(mySaltyBucks - baseline)); */
}

function placeBet(info) {
  var toBet = "player" + (Math.round(Math.random())+1);
  var amount = getAmount();
  winston.info("betting on", {amount: amount, player: toBet, name: toBet === "player1" ? info.p1name : info.p2name});

  request.post({
    url: "http://www.saltybet.com/ajax_place_bet.php",
    form: {selectedplayer: toBet, wager: amount}
  }, function(err, resp, body) {
    if(err) winston.error("error placing bet", err);
    else winston.info("bet placed");
  });
}

function updateState() {
  request("http://www.saltybet.com/state.json", function(e,r,body) {
    winston.debug("state", body);
    var s;
    try {
      s = JSON.parse(body);
    } catch(ex) {
      winston.error("parsing body", ex);
      return;
    }
    if(s.status == "open") {
      placeBet(s);
    }
  });

  request("http://www.saltybet.com/zdata.json", function(e,r,body) {
    var info;
    try {
      info = JSON.parse(body);
    } catch (ex) {
      winston.error("parsing data", ex);
      return;
    }
    winston.debug("zdata", info);
    for(var key in info) {
      if(info[key].n == config.name) {
        var cSaltyBucks = parseInt(info[key].b, 10);
        if(mySaltyBucks != cSaltyBucks) {
          mySaltyBucks = cSaltyBucks;
          setBaseAmount();
          winston.info("Current salty bucks", mySaltyBucks);
        }
      }
    }
  });
}

function serveApi() {
  if(config.serveApi) {
    http.createServer(function(req,res) {
      res.write(JSON.stringify({salt: mySaltyBucks}));
      res.end();
    }).listen(config.apiPort);
  }
}
