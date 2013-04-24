var util = require('util'),
  EventEmitter = require('events').EventEmitter,
  crypto = require('crypto'),
  irc = require('irc');

var TIMEOUT = 1000 * 60 * 15; //15 minutes

function Bot(configuration) {

  var server = configuration.server || 'irc.efnet.pl';
  var channels = configuration.channels || ["#nhat"];
  var debug = configuration.debug || false;
  var nick = configuration.nick || "pircbot";
  this.nick = nick;

  this.actionIndicator = configuration.actionIndicator || ".";

  this.owners = configuration.owners || ["nhat", "hach"];
  this.registeredOwners = {};


  this.bot = new irc.Client(server, nick, {
    debug: debug,
    channels: channels
  });

  var self = this;
  this.bot.addListener('error', function (message) {
    self.emit('error', message);
  });

  /*
   * message  - .pircbot secret key
   * message - .registrationKey command argument
   */
  this.bot.addListener('pm', function (from, message) {
    if (message && message === self.actionIndicator + self.nick && self.owners.indexOf(from) !== -1) {
      var key = generateKey(from);
      self.registeredOwners[from] = key;
      self.emit('owned', from); //notify that owner is added
      self.bot.say(from, key);
      return;
    }

    if (self.isAction(message)) {
      var registerKey = self.registeredOwners[from];
      if (registerKey) {

        var ownerKey = message.substr(self.actionIndicator.length, registerKey.length);
        if (ownerKey !== registerKey) {
          self.emit('hacked', from);
          return;
        }

        var parsedKey = parseKey(registerKey);
        if (parsedKey > Date.now()) {
          var content = message.substr(self.actionIndicator.length + registerKey.length + 1).split(' ');
          self.emit('action', {"from": from, "action": content.shift(), "meta": content});
        } else {
          self.emit('expired', from); //notify expired owner
        }
        return;
      }
    }
    console.log('%s => %s', from, message);
  });

  for (var i = 0; i < channels.length; i++) {
    var channel = channels[i];
    this.bot.addListener('message' + channel, function (from, message) {
      (function (c, f, m) {
        self.emit('message', {"channel": c, "from": f, "message": m});
      })(channel, from, message);
    });
  }

  //TODO: [high] (nhat) - hook up jenkins.

  EventEmitter.call(this);
}

util.inherits(Bot, EventEmitter);

function generateKey(nick) {
  var now = Date.now();
  return (now + TIMEOUT) + crypto.createHash('sha1').update(nick + "" + now).digest('hex').substr(0, 8);
}

function parseKey(content) {
  if (!content || content.length < 8) {
    return null;
  }

  try {
    return parseInt(content.substr(0, content.length - 8));
  } catch (e) {
    return null;
  }
}

Bot.prototype.isAction = function (message) {
  return message && message.charAt(0) == this.actionIndicator;
};


/**
 * action.call(null,this); -> function(bot){}
 * @param action
 */
Bot.prototype.performAction = function (action) {
  //TODO: [high] (nhat) - parse the action or action itself is a function and call it with this.
  if (!action || typeof(action) !== "function") {
    return;
  }
  action.call(null, this.bot); //expose bot for sending command.
};

module.exports = Bot;