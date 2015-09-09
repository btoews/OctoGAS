function muter() {
  var FETCH_OPTIONS, Message, QUERY, Thread, UNSUB_HEADER, UNSUB_URL_PREFIX, UNSUB_URL_REGEX, i, id, len, ref;

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
      var i, len, results, t, threads;
      threads = GmailApp.search(query);
      GmailApp.getMessagesForThreads(threads);
      results = [];
      for (i = 0, len = threads.length; i < len; i++) {
        t = threads[i];
        results.push(new Thread(t));
      }
      return results;
    };

    function Thread(_thread) {
      var m;
      this._thread = _thread;
      this.id = this._thread.getId();
      Thread.all[this.id] = this;
      Thread.ids.push(this.id);
      this.messages = (function() {
        var i, len, ref, results;
        ref = this._thread.getMessages() || [];
        results = [];
        for (i = 0, len = ref.length; i < len; i++) {
          m = ref[i];
          results.push(new Message(m));
        }
        return results;
      }).call(this);
      this.subject = this._thread.getFirstMessageSubject();
    }

    Thread.prototype.unsubscribeAndUnmute = function() {
      return !!(this.unsubscribe() && this.unmute());
    };

    Thread.prototype.unsubscribe = function() {
      var res, url;
      if (url = this.unsubUrl()) {
        if (res = UrlFetchApp.fetch(url, FETCH_OPTIONS)) {
          if (res.getResponseCode() === 200) {
            return true;
          } else {
            return false;
          }
        } else {
          return false;
        }
      } else {
        return true;
      }
    };

    Thread.prototype.unsubUrl = function() {
      if (this.messages.length > 0) {
        return this.messages[0].unsubUrl();
      }
    };

    Thread.prototype.unmute = function() {
      this.moveToInbox();
      this.moveToArchive();
      return true;
    };

    Thread.prototype.moveToInbox = function() {
      return this._thread.moveToInbox();
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
      var i, len, match, raw, ref, value;
      if (raw = this.headers()[UNSUB_HEADER]) {
        ref = raw.split(", ");
        for (i = 0, len = ref.length; i < len; i++) {
          value = ref[i];
          if (match = value.match(UNSUB_URL_REGEX)) {
            return match[1];
          }
        }
      }
    };

    Message.prototype.headers = function() {
      var i, key, len, line, match, parts, ref, ref1, value;
      if (this._headers == null) {
        this._headers = {};
        parts = this._message.getRawContent().split("\r\n\r\n", 2);
        ref = parts[0].split("\r\n");
        for (i = 0, len = ref.length; i < len; i++) {
          line = ref[i];
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

  Thread.loadFromSearch(QUERY);

  ref = Thread.ids;
  for (i = 0, len = ref.length; i < len; i++) {
    id = ref[i];
    Thread.all[id].unsubscribeAndUnmute();
  }

}
