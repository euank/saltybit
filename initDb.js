/* Init the leveldb of past matches from a given logfile produced by previous runs of this program

  Example line from this log file:
  {"p1name":"Ironpatriot","p2name":"Scarecrow","p1total":"313,258","p2total":"42,980","status":"1","alert":"","x":1}
  This line indicates that player1, "Ironpatriot" won (status: 1)
  Our leveldb database is simple. It's of the form key: ["player1name","player2name"].sort(), value: [1wins, 2wins]
*/

if(process.argv.length != 3) {
  return console.log("please provide a single logfile to parse");
}

var sqlite3 = require('sqlite3'),
    fs = require('fs');

var fileLines = fs.readFileSync(process.argv[2]).toString().split("\n");

var db = new sqlite3.Database('./saltybit.db');

db.run('CREATE TABLE IF NOT EXISTS player_history(p1name TEXT, p2name TEXT, winner INTEGER, t TIMESTAMP DEFAULT CURRENT_TIMESTAMP)', function(err) {
  if(err) return console.log(err);
  var stmnt = db.prepare('INSERT INTO player_history(p1name, p2name, winner) VALUES(?,?,?)', function(err) { if(err) console.log(err); });
  for(var i=0;i<fileLines.length;i++) {
    try {
      var line = JSON.parse(fileLines[i]);
      if(line.status === "1" || line.status === "2" && line.p1name && line.p2name) {
        console.log(line);
        stmnt.run(line.p1name, line.p2name, line.status === "1" ? 1 : 2, function(err) {
          if(err) console.log(err);
        });
        var players = [line.p1name, line.p2name].sort();
        var win;
        if(players[0] === line.p1name) {
          win = line.status;
        }
      }
    } catch(ex) {
      //lots of non-conformant lines
    }
  }
  stmnt.finalize();
});

