//
// <Config>
//

// An Array of teams I'm on. Eg ["@myorg/myteam"]
var my_teams   = ["@github/security", "@github/dotcom-security", "@github/2fa"]

// The base label to create repo labels under.
var base_label = ["GitHub"]

//
// </Config>
//

var my_teams_regex = new RegExp('(' + my_teams.join('|') + ')')

function GitHubThread(thread) {
  this._thread = thread

  // Determine why we got this message and label the thread accordingly.
  //
  // Returns nothing.
  this.labelForReason = function() {
    var reason, label
    reason = this.getReason()
    if (reason.mention)
      this.addLabel("Direct Mention")
    else if (reason.team_mention == true)
      this.addLabel("Team Mention") // Unknown team mentioned
    else if (reason.team_mention)
      this.addLabel(["Team Mention", reason.team_mention])
    else if (reason.meta)
      this.addLabel("Meta")
    else if (reason.watching == true)
      this.addLabel("Watching") // Unknown watched repo (maybe?).
    else if (reason.watching)
      this.addLabel(["Watching", reason.watching])
    else
      this.addLabel("Unknown")
  }

  // Add a label to this thread.
  //
  // parts - The parts of the nested label (Eg. ["Mentions", "Direct"]).
  //
  // Returns nothing.
  this.addLabel = function(parts) {
    var label = getOrCreateLabel(parts)
    Logger.log("Applying label '%s' to thread '%s'", label.getName(), this.getSubject())
    label.addToThread(this._thread)
  }

  // Get the subject of the first message in this thread.
  //
  // Returns a String.
  this.getSubject = function() {
    return this._thread.getFirstMessageSubject()
  }

  // Get the reason for us receiving this message.
  //
  // Returns an Object where the key is the name of the reason and the value is
  // more information about the reason.
  this.getReason = function() {
    if (!this._reason) {
      var messages = this.getMessages()
      this._reason = messages[messages.length -1].getReason()

      // Let's see if we can find what team was mentioned if this was a team mention.
      for (var i = messages.length - 2; i >= 0 && this._reason.team_mention == true; i--) {
        this._reason = messages[i].getReason()
      }
    }
    return this._reason
  }

  // Get the messages in this thread.
  //
  // Returns an Array of GitHubMessages.
  this.getMessages = function() {
    if (!this._messages) {
      this._messages = this._thread.getMessages().map(function(message) {
        return new GitHubMessage(message)
      })
    }
    return this._messages
  }
}

function GitHubMessage(message) {
  this._message = message

  // Get the reason for us receiving this message.
  //
  // Returns an Object where the key is the name of the reason and the value is
  // more information about the reason.
  this.getReason = function() {
    if (!this._reason) {
      switch(this.getHeaders()['X-GitHub-Reason']) {
        case 'mention':
          this._reason = {mention: true}
          break
        case 'team_mention':
          this._reason = {team_mention: this.getTeamMention() || true}
          break
        case 'author':
          this._reason = {author: true}
          break
        default:
          if (this.isFromNotifications())
            this._reason = {watching: this.firstNameFromHeader('List-ID') || true}
          else if (this.isFromNoReply())
            this._reason = {meta: true}
          else
            this._reason = {} // This shouldn't happen I hope
      }
    }
    return this._reason
  }

  // Get the SMPT headers from the message.
  //
  // Returns an Object of header_name => header_value. Will log parsing errors, but try not to fail, possibly returning an empty Object instead.
  this.getHeaders = function() {
    if (this._headers == undefined) {
      var parts, match, header_parts
      this._headers = {}
      parts = this._message.getRawContent().split("\r\n\r\n", 2)

      if (parts.length == 2) {
        var header_lines = parts[0].split("\r\n")

        // Headers starting with whitespace are a continuation of the previous line. Rejoin them.
        for (var i = header_lines.length - 1; i > 0; i--) {
          if (match = header_lines[i].match(/^\s+(.*)/)) {
            header_lines[i - 1] += " " + match[1]
            header_lines.splice(i, 1)
          }
        }

        // Turn this array of headers into an Object.
        for (var i = 0; i < header_lines.length; i++) {
          header_parts = header_lines[i].split(": ", 2)
          if (header_parts.length == 2) {
            if (Array.isArray(this._headers[header_parts[0]])) {
              this._headers[header_parts[0]].push(header_parts[1])
            } else if (this._headers[header_parts[0]]) {
              this._headers[header_parts[0]] = [this._headers[header_parts[0]], header_parts[1]]
            } else {
              this._headers[header_parts[0]] = header_parts[1]
            }
          } else {
            Logger.log("Error parsing raw message header. Doesn't match format: %s", header_lines[i])
          }
        }
        return this._headers
      } else {
        Logger.log("Error parsing raw message. Headers and message weren't double newline delimited: %s", this._message.getRawContent())
        return {}
      }
    }

    return this._headers
  }

  // Does this message @mention one of my teams?
  //
  // Returns the matching String team name or undefined.
  this.getTeamMention = function() {
    return (this._message.getPlainBody().match(my_teams_regex) || [])[1]
  }

  // Is this message from notifications@github.com?
  //
  // Returns a bool.
  this.isFromNotifications = function() {
    return this.firstAddressFromHeader('From') == "notifications@github.com"
  }

  // Is this message from noreply@github.com?
  //
  // Returns a bool.
  this.isFromNoReply = function() {
    return this.firstAddressFromHeader('From') == "noreply@github.com"
  }

  // Get the email address out of a header field like "From: Foo Bar <foobar@gmail.com>"
  //
  // header - The name of the header to parse.
  //
  // Retruns a String or undefined.
  this.firstAddressFromHeader = function(header) {
    return (this.getHeaders()[header].match(/.*? <(.*)>/) || [])[1]
  }

  // The the name our of an address header like "From: Foo Bar <foobar@gmail.com>"
  //
  // header - The name of the header to parse.
  //
  // Retruns a String.
  this.firstNameFromHeader = function(header) {
    return (this.getHeaders()[header].match(/(.*?) <.*>/) || [])[1]
  }
}

// Get or create a nested GmailLabel.
//
// parts - The parts of the nested label (Eg. ["Mentions", "Direct"]).
//
// Returns a GmailLabel.
function getOrCreateLabel(parts) {
  var label, name
  if (!Array.isArray(parts))
    parts = [parts]
  name = base_label.concat(parts).join("/")

  if ( !(label = GmailApp.getUserLabelByName(name)) ) {
    if (parts.length) {
      parts.pop()
      getOrCreateLabel(parts)
    }
    label = GmailApp.createLabel(name)
  }
  return label
}

// Get GmailThreads in the inbox from GitHub.
//
// Returns an Array of Threads.
function getGitHubThreadsInInbox() {
  var threads
  try {
    threads = GmailApp.search('in:inbox AND (from:"notifications@github.com" OR from:"noreply@github.com")')
  } catch(err) {
    throw "Error searching inbox for messages from GitHub. Probably too many results"
  }

  // Preload all messages in one shot.
  GmailApp.getMessagesForThreads(threads)
  
  return threads.map(function(gmail_thread) {
    return new GitHubThread(gmail_thread)
  })
}

// Find messages from GitHub in the inbox and label them.
//
// Returns nothing.
function processInbox() {
  Logger.log("Processing inbox")
  var threads = getGitHubThreadsInInbox()
  Logger.log("Found %s threads", threads.length)
  threads.forEach(function(thread) {
    thread.labelForReason()
  })
}
