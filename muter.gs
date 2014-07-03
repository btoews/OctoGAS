var FETCH_OPTIONS, Message, QUERY, Thread, UNSUB_HEADER, UNSUB_URL_PREFIX, UNSUB_URL_REGEX, muter;

QUERY = "is:mute AND ( from:\"notifications@github.com\" OR from:\"noreply@github.com\" )";

UNSUB_HEADER = "List-Unsubscribe";

UNSUB_URL_PREFIX = "https://github.com/notifications/unsubscribe";

UNSUB_URL_REGEX = new RegExp("<(" + UNSUB_URL_PREFIX + "/.*?)>");

FETCH_OPTIONS = {
  muteHttpExceptions: true
};

Thread = (function() {
  Thread.all = {};

  Thread.ids = [];

  Thread.loadFromSearch = function(query) {
    var t, threads, _i, _len, _results;
    threads = GmailApp.search(query);
    Logger.log("found " + threads.length + " threads");
    GmailApp.getMessagesForThreads(threads);
    _results = [];
    for (_i = 0, _len = threads.length; _i < _len; _i++) {
      t = threads[_i];
      _results.push(new Thread(t));
    }
    return _results;
  };

  function Thread(_thread) {
    var m;
    this._thread = _thread;
    this.id = this._thread.getId();
    Thread.all[this.id] = this;
    Thread.ids.push(this.id);
    this.messages = (function() {
      var _i, _len, _ref, _results;
      _ref = this._thread.getMessages() || [];
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        m = _ref[_i];
        _results.push(new Message(m));
      }
      return _results;
    }).call(this);
    this.subject = this._thread.getFirstMessageSubject();
  }

  Thread.prototype.unsubscribeAndUnmute = function() {
    return !!(this.unsubscribe() && this.unmute());
  };

  Thread.prototype.unsubscribe = function() {
    var res, url;
    if (url = this.unsubUrl()) {
      Logger.log("usub url for '" + this.subject + "': '" + url + "'");
      if (res = UrlFetchApp.fetch(url, FETCH_OPTIONS)) {
        if (res.getResponseCode() === 200) {
          Logger.log("win");
          return true;
        } else {
          Logger.log("lose");
          return false;
        }
      }
    }
  };

  Thread.prototype.unsubUrl = function() {
    if (this.messages.length > 0) {
      return this.messages[0].unsubUrl();
    }
  };

  Thread.prototype.unmute = function() {
    Logger.log("unmuting: " + this.subject);
    this.moveToArchive();
    return true;
  };

  Thread.prototype.moveToArchive = function() {
    return this._thread.moveToArchive();
  };

  return Thread;

})();

Message = (function() {
  function Message(_message) {
    this._message = _message;
  }

  Message.prototype.unsubUrl = function() {
    var match, raw, value, _i, _len, _ref;
    if (raw = this.headers()[UNSUB_HEADER]) {
      _ref = raw.split(", ");
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        value = _ref[_i];
        if (match = value.match(UNSUB_URL_REGEX)) {
          return match[1];
        }
      }
    }
  };

  Message.prototype.headers = function() {
    var key, line, match, parts, value, _i, _len, _ref, _ref1;
    if (this._headers == null) {
      this._headers = {};
      parts = this._message.getRawContent().split("\r\n\r\n", 2);
      _ref = parts[0].split("\r\n");
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        line = _ref[_i];
        if (match = line.match(/^\s+(.*)/)) {
          value += " " + match[1];
        } else {
          if ((typeof key !== "undefined" && key !== null) && (typeof value !== "undefined" && value !== null)) {
            this.setHeader(this._headers, key, value);
          }
          _ref1 = line.split(": ", 2), key = _ref1[0], value = _ref1[1];
        }
      }
      if ((key != null) && (value != null)) {
        this.setHeader(this._headers, key, value);
      }
    }
    return this._headers;
  };

  Message.prototype.setHeader = function(headers, key, value) {
    if (Array.isArray(headers[key])) {
      return headers[key].push(value);
    } else if (headers[key] != null) {
      return headers[key] = [headers[key], value];
    } else {
      return headers[key] = value;
    }
  };

  return Message;

})();

function muter() {
  var id, _i, _len, _ref;
  Logger.log("starting");
  Thread.loadFromSearch(QUERY);
  _ref = Thread.ids;
  for (_i = 0, _len = _ref.length; _i < _len; _i++) {
    id = _ref[_i];
    Thread.all[id].unsubscribeAndUnmute();
  }
  return Logger.log("done");
};
