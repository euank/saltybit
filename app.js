var io = require('socket.io-client');
var http = require('http');
var request = require('request');
var config = require("./config");

var sock = io.connect("http://www-cdn-twitch.saltybet.com:8000");

var request = request.defaults({jar: true})

var mySaltyBucks = 0;

request.post('http://www.saltybet.com/authenticate?signin=1')
  .form({email: config.email, pword: config.password, authenticate: "signin"});


sock.on("message", function(data) {
  updateState()
});


function placeBet() {
  var toBet = "player" + (Math.round(Math.random())+1);
  console.log("PLACING BET ON ", toBet);
  request.post("http://www.saltybet.com/ajax_place_bet.php")
  .form({radio: 'on', selectedplayer: toBet, wager: 1});
}

function updateState() {
  request("http://www.saltybet.com/state.json", function(e,r,body) {
    var s = JSON.parse(body);
    if(s.status == "open") {
      placeBet();
    }
  });

  request("http://www.saltybet.com/zdata.json", function(e,r,body) {
    var info = JSON.parse(body);
    for(key in info) {
      if(info[key]["n"] == config.name) {
        var cSaltyBucks = parseInt(info[key]["b"], 10);
        if(mySaltyBucks != cSaltyBucks) {
          mySaltyBucks = cSaltyBucks;
          console.log("Current salty bucks are: " + mySaltyBucks);
        }
      }
    }
  });
}
