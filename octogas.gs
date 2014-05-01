var BASE_LABEL, CACHE, CACHE_VERSION, Label, MY_TEAMS, MY_TEAMS_REGEX, Message, QUERY, Thread, main,
  __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

MY_TEAMS = [];

BASE_LABEL = ["GitHub"];

QUERY = 'in:inbox AND (from:"notifications@github.com" OR from:"noreply@github.com")';

MY_TEAMS_REGEX = new RegExp("(" + (MY_TEAMS.join('|')) + ")");

CACHE = CacheService.getPrivateCache();

CACHE_VERSION = 1;

Label = (function() {
  Label.all = {};

  Label.names = [];

  Label.loadPersisted = function() {
    var l, _i, _len, _ref, _results;
    _ref = GmailApp.getUserLabels();
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      l = _ref[_i];
      _results.push(new Label(l.getName(), l));
    }
    return _results;
  };

  Label.findOrCreate = function(name_parts) {
    var name;
    if (name_parts.length > 1) {
      this.findOrCreate(name_parts.slice(0, name_parts.length - 1));
    }
    name = name_parts.join("/");
    return this.find(name) || new Label(name);
  };

  Label.find = function(name) {
    if (__indexOf.call(this.names, name) >= 0) {
      return this.all[name];
    }
  };

  Label.applyAll = function() {
    var n, _i, _len, _ref, _results;
    _ref = this.names;
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      n = _ref[_i];
      _results.push(this.all[n].apply());
    }
    return _results;
  };

  function Label(name, _label) {
    this.name = name;
    this._label = _label;
    this._queue = [];
    this._label || (this._label = GmailApp.createLabel(this.name));
    Label.all[this.name] = this;
    Label.names.push(this.name);
  }

  Label.prototype.queue = function(thread) {
    if (__indexOf.call(this._queue, thread) < 0) {
      return this._queue.push(thread);
    }
  };

  Label.prototype.apply = function() {
    var t, threads;
    threads = (function() {
      var _i, _len, _ref, _results;
      _ref = this._queue;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        t = _ref[_i];
        _results.push(t._thread);
      }
      return _results;
    }).call(this);
    if (threads.length) {
      this._label.addToThreads(threads);
    }
    return this._queue = [];
  };

  return Label;

})();

Thread = (function() {
  Thread.all = {};

  Thread.ids = [];

  Thread.loadFromSearch = function(query) {
    var t, threads, _i, _len, _results;
    threads = GmailApp.search(query);
    GmailApp.getMessagesForThreads(threads);
    _results = [];
    for (_i = 0, _len = threads.length; _i < _len; _i++) {
      t = threads[_i];
      _results.push(new Thread(t));
    }
    return _results;
  };

  Thread.labelAllForReason = function() {
    var id, _i, _len, _ref, _results;
    _ref = this.ids;
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      id = _ref[_i];
      _results.push(this.all[id].labelForReason());
    }
    return _results;
  };

  function Thread(_thread) {
    var m;
    this._thread = _thread;
    this.id = this._thread.getId();
    this.messages = (function() {
      var _i, _len, _ref, _results;
      _ref = this._thread.getMessages();
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        m = _ref[_i];
        _results.push(new Message(m));
      }
      return _results;
    }).call(this);
    Thread.all[this.id] = this;
    Thread.ids.push(this.id);
  }

  Thread.prototype.labelForReason = function() {
    var reason;
    reason = this.reason();
    if (reason.author) {
      return this.queueLabel(["Author"]);
    } else if (reason.mention) {
      return this.queueLabel(["Direct Mention"]);
    } else if (reason.team_mention === true) {
      return this.queueLabel(["Team Mention"]);
    } else if (reason.team_mention) {
      return this.queueLabel(["Team Mention", reason.team_mention]);
    } else if (reason.meta) {
      return this.queueLabel(["Meta"]);
    } else if (reason.watching === true) {
      return this.queueLabel(["Watching"]);
    } else if (reason.watching) {
      return this.queueLabel(["Watching", reason.watching]);
    } else {
      return this.queueLabel(["Unknown"]);
    }
  };

  Thread.prototype.queueLabel = function(name_parts) {
    var label;
    name_parts = BASE_LABEL.concat(name_parts);
    label = Label.findOrCreate(name_parts);
    return label.queue(this);
  };

  Thread.prototype.reason = function() {
    var i;
    if (this._reason == null) {
      i = this.messages.length - 1;
      this._reason = this.messages[i].reason();
      while (this._reason.team_mention === true && i >= 0) {
        this._reason = this.messages[i].reason();
        i--;
      }
    }
    return this._reason;
  };

  return Thread;

})();

Message = (function() {
  Message.all = {};

  Message.keys = [];

  Message.loadReasonsFromCache = function() {
    var k, reasons, _i, _len, _ref, _results;
    reasons = CACHE.getAll(this.keys);
    _ref = this.keys;
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      k = _ref[_i];
      _results.push(this.all[k].loadReason(reasons[k]));
    }
    return _results;
  };

  Message.dumpReasonsToCache = function() {
    var k, reasons, _i, _len, _ref;
    reasons = {};
    _ref = this.keys;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      k = _ref[_i];
      reasons[k] = this.all[k].dumpReason();
    }
    return CACHE.putAll(reasons);
  };

  function Message(_message) {
    this._message = _message;
    this.id = this._message.getId();
    this.key = "octogas:v" + CACHE_VERSION + ":message_reason:" + this.id;
    Message.all[this.key] = this;
    Message.keys.push(this.key);
  }

  Message.prototype.reason = function() {
    return this._reason || (this._reason = (function() {
      switch (this.headers()['X-GitHub-Reason']) {
        case 'mention':
          return {
            mention: true
          };
        case 'team_mention':
          return {
            team_mention: this.teamMention() || true
          };
        case 'author':
          return {
            author: true
          };
        default:
          switch (this.from()) {
            case "notifications@github.com":
              return {
                watching: this.firstNameInHeader('List-ID') || true
              };
            case "noreply@github.com":
              return {
                meta: true
              };
            default:
              return {};
          }
      }
    }).call(this));
  };

  Message.prototype.loadReason = function(reason) {
    if (reason != null) {
      return this._reason = JSON.parse(reason);
    }
  };

  Message.prototype.dumpReason = function() {
    return JSON.stringify(this.reason());
  };

  Message.prototype.teamMention = function() {
    return this._teamMention || (this._teamMention = (this._message.getPlainBody().match(MY_TEAMS_REGEX) || [])[1]);
  };

  Message.prototype.from = function() {
    return this._from || (this._from = this.firstAddressInHeader('From'));
  };

  Message.prototype.firstAddressInHeader = function(header) {
    return (this.headers()[header].match(/.*? <(.*)>/) || [])[1];
  };

  Message.prototype.firstNameInHeader = function(header) {
    return (this.headers()[header].match(/(.*?) <.*>/) || [])[1];
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

function main() {
  Label.loadPersisted();
  Thread.loadFromSearch(QUERY);
  Message.loadReasonsFromCache();
  Thread.labelAllForReason();
  Label.applyAll();
  return Message.dumpReasonsToCache();
};
