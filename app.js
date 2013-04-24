var Bot = require('./lib/bot');

var bot = new Bot({
  server: process.argv[1]
});

bot.on('message', function (data) {
  console.log(JSON.stringify(data));
});

bot.on('action', function (data) {
  if (data.action === 'echo') {
    bot.performAction(function (b) {

    });
  }
});

bot.on('owned', function (data) {
  console.log("owned by " + data);
});

bot.on('error', function (message) {
  console.log(message);
});
