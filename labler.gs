function labler() {
  var BASE_LABEL, CACHE, CACHE_EXPIRY, CACHE_VERSION, Label, MY_TEAMS, MY_TEAMS_REGEX, Message, QUERY, SHOULD_ARCHIVE, Thread, error,
    indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  MY_TEAMS = fetchCachedGitHubTeamSlugs() !== "err" ? fetchCachedGitHubTeamSlugs() : [];

  BASE_LABEL = ["GitHub"];

  SHOULD_ARCHIVE = false;

  QUERY = "label:github-pending";

  MY_TEAMS_REGEX = new RegExp("(" + (MY_TEAMS.join('|')) + ")");

  CACHE = CacheService.getUserCache();

  CACHE_VERSION = 1;

  CACHE_EXPIRY = 60 * 60 * 2;

  Label = (function() {
    Label.all = {};

    Label.names = [];

    Label.loadPersisted = function() {
      var j, l, len, ref, results;
      ref = GmailApp.getUserLabels();
      results = [];
      for (j = 0, len = ref.length; j < len; j++) {
        l = ref[j];
        results.push(new Label(l.getName(), l));
      }
      return results;
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
      if (indexOf.call(this.names, name) >= 0) {
        return this.all[name];
      }
    };

    Label.applyAll = function() {
      var j, len, n, ref, results;
      ref = this.names;
      results = [];
      for (j = 0, len = ref.length; j < len; j++) {
        n = ref[j];
        results.push(this.all[n].apply());
      }
      return results;
    };

    function Label(name1, _label) {
      this.name = name1;
      this._label = _label;
      this._queue = [];
      this._label || (this._label = GmailApp.createLabel(this.name));
      Label.all[this.name] = this;
      Label.names.push(this.name);
    }

    Label.prototype.queue = function(thread) {
      if (indexOf.call(this._queue, thread) < 0) {
        return this._queue.push(thread);
      }
    };

    Label.prototype.apply = function() {
      var j, len, ref, ref1, t, threads;
      threads = (function() {
        var j, len, ref, results;
        ref = this._queue;
        results = [];
        for (j = 0, len = ref.length; j < len; j++) {
          t = ref[j];
          results.push(t._thread);
        }
        return results;
      }).call(this);
      ref = this._queue;
      for (j = 0, len = ref.length; j < len; j++) {
        t = ref[j];
        if (ref1 = t.id, indexOf.call(Thread.done, ref1) < 0) {
          Thread.done.push(t.id);
        }
      }
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

    Thread.done = [];

    Thread.doneKey = "octogas:v" + CACHE_VERSION + ":threads_done";

    Thread.loadFromSearch = function(query) {
      var j, len, results, t, threads;
      threads = GmailApp.search(query);
      GmailApp.getMessagesForThreads(threads);
      results = [];
      for (j = 0, len = threads.length; j < len; j++) {
        t = threads[j];
        results.push(new Thread(t));
      }
      return results;
    };

    Thread.labelAllForReason = function() {
      var id, j, len, ref, results;
      ref = this.ids;
      results = [];
      for (j = 0, len = ref.length; j < len; j++) {
        id = ref[j];
        if (!this.all[id].alreadyDone()) {
          results.push(this.all[id].labelForReason());
        }
      }
      return results;
    };

    Thread.loadDoneFromCache = function() {
      var cached;
      cached = CACHE.get(this.doneKey);
      if (cached) {
        return this.done = JSON.parse(cached);
      }
    };

    Thread.dumpDoneToCache = function() {
      return CACHE.put(this.doneKey, JSON.stringify(this.done), CACHE_EXPIRY);
    };

    Thread.archiveAll = function() {
      var id, threadsToArchive;
      threadsToArchive = (function() {
        var j, len, ref, results;
        ref = this.ids;
        results = [];
        for (j = 0, len = ref.length; j < len; j++) {
          id = ref[j];
          if (!Thread.all[id].alreadyDone()) {
            results.push(Thread.all[id]._thread);
          }
        }
        return results;
      }).call(this);
      return GmailApp.moveThreadsToArchive(threadsToArchive);
    };

    Thread.removePending = function() {
      var id, threadsPending, pendingLabel;
      threadsPending = (function() {
        var _i, _len, _ref, _results;
        _ref = this.ids;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          id = _ref[_i];
          if (!Thread.all[id].alreadyDone()) {
            _results.push(Thread.all[id]._thread);
          }
        }
        return _results;
      }).call(this);
      pendingLabel = Label.findOrCreate(BASE_LABEL.concat(["Pending"]));
      pendingLabel._label.removeFromThreads(threadsPending);
    }

    function Thread(_thread) {
      var m;
      this._thread = _thread;
      this.id = this._thread.getId();
      Thread.all[this.id] = this;
      Thread.ids.push(this.id);
      this.messages = (function() {
        var j, len, ref, results;
        ref = this._thread.getMessages() || [];
        results = [];
        for (j = 0, len = ref.length; j < len; j++) {
          m = ref[j];
          results.push(new Message(m));
        }
        return results;
      }).call(this);
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
      if (!((this._reason != null) || this.messages.length === 0)) {
        i = this.messages.length - 1;
        this._reason = this.messages[i].reason();
        while (this._reason.team_mention === true && i >= 0) {
          this._reason = this.messages[i].reason();
          i--;
        }
      }
      return this._reason;
    };

    Thread.prototype.alreadyDone = function() {
      return Thread.done.indexOf(this.id) >= 0;
    };

    return Thread;

  })();

  Message = (function() {
    Message.all = {};

    Message.keys = [];

    Message.loadReasonsFromCache = function() {
      var j, k, len, reasons, ref, results;
      reasons = CACHE.getAll(this.keys);
      ref = this.keys;
      results = [];
      for (j = 0, len = ref.length; j < len; j++) {
        k = ref[j];
        results.push(this.all[k].loadReason(reasons[k]));
      }
      return results;
    };

    Message.dumpReasonsToCache = function() {
      var j, k, len, reasons, ref;
      reasons = {};
      ref = this.keys;
      for (j = 0, len = ref.length; j < len; j++) {
        k = ref[j];
        if (this.all[k]._reason != null) {
          reasons[k] = JSON.stringify(this.all[k]._reason);
        }
      }
      return CACHE.putAll(reasons, CACHE_EXPIRY);
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

    Message.prototype.teamMention = function() {
      var match, message;
      return this._teamMention || (this._teamMention = (message = this._message.getPlainBody()) ? (match = message.match(MY_TEAMS_REGEX)) ? match[1] : void 0 : void 0);
    };

    Message.prototype.from = function() {
      return this._from || (this._from = this.firstAddressInHeader('From'));
    };

    Message.prototype.firstAddressInHeader = function(header) {
      var ref, ref1;
      return (ref = this.headers()[header]) != null ? (ref1 = ref.match(/.*? <(.*)>/)) != null ? ref1[1] : void 0 : void 0;
    };

    Message.prototype.firstNameInHeader = function(header) {
      return (this.headers()[header].match(/(.*?) <.*>/) || [])[1];
    };

    Message.prototype.headers = function() {
      var j, key, len, line, match, parts, ref, ref1, value;
      if (this._headers == null) {
        this._headers = {};
        parts = this._message.getRawContent().split("\r\n\r\n", 2);
        ref = parts[0].split("\r\n");
        for (j = 0, len = ref.length; j < len; j++) {
          line = ref[j];
          if (match = line.match(/^\s+(.*)/)) {
            value += " " + match[1];
          } else {
            if ((typeof key !== "undefined" && key !== null) && (typeof value !== "undefined" && value !== null)) {
              this.setHeader(this._headers, key, value);
            }
            ref1 = line.split(": ", 2), key = ref1[0], value = ref1[1];
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

  Label.loadPersisted();

  Thread.loadFromSearch(QUERY);

  Thread.loadDoneFromCache();

  Message.loadReasonsFromCache();

  try {
    Thread.labelAllForReason();
    if (SHOULD_ARCHIVE) {
      Thread.archiveAll();
    } else {
      Thread.removePending();
    }
  } catch (error1) {
    error = error1;
    Logger.log(error);
  } finally {
    try {
      Label.applyAll();
    } catch (error1) {
      Logger.log(error);
    } finally {
      Thread.dumpDoneToCache();
      Message.dumpReasonsToCache();
    }
  }

}
