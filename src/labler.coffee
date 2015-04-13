# An Array of teams I'm on. Eg ["@myorg/myteam"]
MY_TEAMS = if fetchCachedGitHubTeamSlugs() != "err"
  fetchCachedGitHubTeamSlugs()
else
  []

# Base label name to apply to nest all other labels under.
BASE_LABEL = ["GitHub"]

# Archive your messages after labeling.
SHOULD_ARCHIVE = false

# The Gmail search to find threads to label
QUERY = "in:inbox AND
         (
           from:\"notifications@github.com\" OR
           from:\"noreply@github.com\"
         )"

# Finds team mentions for my teams and extracts the team name.
MY_TEAMS_REGEX = new RegExp "(#{MY_TEAMS.join('|')})"

# Private cache so we don't need to process every message every time.
CACHE = CacheService.getUserCache()
CACHE_VERSION = 1
CACHE_EXPIRY = 60 * 60 * 2

class Label
  @all   = {}
  @names = []

  # Load Labels that have been persisted with Gmail.
  #
  # Returns an Array of Labels.
  @loadPersisted: ->
    # Load labels that are already persisted with Gmail.
    new Label(l.getName(), l) for l in GmailApp.getUserLabels()

  # Find or create a nested Label and its parent Labels given its name parts.
  #
  # name_parts - An Array of nested label names.
  #
  # Returns a Label.
  @findOrCreate: (name_parts) ->
    # Make sure the parent label exists.
    if name_parts.length > 1
      @findOrCreate(name_parts.slice(0, name_parts.length - 1))

    name = name_parts.join "/"
    @find(name) || new Label(name)

  # Find a label by its name.
  #
  # name - The full String name.
  #
  # Returns a Label or undefined.
  @find: (name) ->
    @all[name] if name in @names

  # Apply all Labels to all queued Threads.
  #
  # Returns nothing.
  @applyAll: ->
    @all[n].apply() for n in @names

  # Instantiate a Label, creating it on Gmail if it doesn't exist.
  #
  # @name   - The full String name of the label.
  # @_label - The GmailLabel object for this label (optional).
  #
  # Returns nothing
  constructor: (@name, @_label) ->
    @_queue          = []
    @_label        ||= GmailApp.createLabel(@name)
    Label.all[@name] = @
    Label.names.push @name

  # Queue a thread to have this label applied.
  #
  # thread - The Thread to apply this label to.
  #
  # Returns nothing.
  queue: (thread) ->
    @_queue.push(thread) unless thread in @_queue

  # Apply this label to all queued Threads.
  #
  # Returns nothing.
  apply: ->
    threads = (t._thread for t in @_queue)
    Thread.done.push(t.id) for t in @_queue when t.id not in Thread.done
    @_label.addToThreads threads if threads.length
    @_queue = []


class Thread
  @all     = {}
  @ids     = []
  @done    = []
  @doneKey = "octogas:v#{CACHE_VERSION}:threads_done"

  # Load threads from a given search query.
  #
  # query - The search query to run.
  #
  # Returns an Array of Threads.
  @loadFromSearch: (query) ->
    threads = GmailApp.search(query)

    # Preload all the messages to speed things up.
    GmailApp.getMessagesForThreads(threads)
    new Thread(t) for t in threads

  # Queue all threads to have the appropriate labels applied given our reason
  # for receiving them.
  #
  # Returns nothing.
  @labelAllForReason: ->
    @all[id].labelForReason() for id in @ids when !@all[id].alreadyDone()

  # Load a list of Thread ids that have already been labled. Because the ids
  # are based on the messages in the thread, new messages in a thread will
  # trigger relabeling.
  #
  # Returns nothing.
  @loadDoneFromCache: ->
    cached = CACHE.get @doneKey
    @done = JSON.parse(cached) if cached

  # Save the list of ids that we have already labeled.
  #
  # Returns nothing.
  @dumpDoneToCache: ->
    CACHE.put @doneKey, JSON.stringify(@done), CACHE_EXPIRY

  # Archive all the messages in every thread.
  #
  # Returns nothing.
  @archiveAll: ->
    threadsToArchive = (Thread.all[id]._thread for id in @ids when !Thread.all[id].alreadyDone())
    GmailApp.moveThreadsToArchive(threadsToArchive)

  # Instantiate a Thread.
  #
  # @_thread - A GmailThread.
  #
  # Returns nothing.
  constructor: (@_thread) ->
    @id = @_thread.getId()
    Thread.all[@id] = @
    Thread.ids.push @id
    @messages = (new Message(m) for m in @_thread.getMessages() || [])

  # Determine why we got this message and label the thread accordingly.
  #
  # Returns nothing.
  labelForReason: ->
    reason = @reason()
    if reason.author
      @queueLabel ["Author"]
    else if reason.mention
      @queueLabel ["Direct Mention"]
    else if reason.team_mention == true
      @queueLabel ["Team Mention"] # Unknown team mentioned
    else if reason.team_mention
      @queueLabel ["Team Mention", reason.team_mention]
    else if reason.meta
      @queueLabel ["Meta"]
    else if reason.watching == true
      @queueLabel ["Watching"] # Unknown watched repo (maybe?).
    else if reason.watching
      @queueLabel ["Watching", reason.watching]
    else
      @queueLabel ["Unknown"]

  # Queue this thread to be given a label.
  #
  # name_parts - The Array of parts of the nested label names.
  #
  # Returns nothing.
  queueLabel: (name_parts) ->
    name_parts = BASE_LABEL.concat name_parts
    label = Label.findOrCreate name_parts
    label.queue @

  # Get the reason for us receiving this message.
  #
  # Returns an Object where the key is the name of the reason and the value is
  # more information about the reason.
  reason: ->
    unless @_reason? || @messages.length == 0
      i = @messages.length - 1
      @_reason = @messages[i].reason()

      # Let's see if we can find what team was mentioned if this was a team mention.
      while @_reason.team_mention == true and i >= 0
        @_reason = @messages[i].reason()
        i--

    @_reason

  # Has this thread already been labeled?
  #
  # Returns a bool.
  alreadyDone: ->
    Thread.done.indexOf(@id) >= 0


class Message
  @all  = {}
  @keys = []

  # Load all reasons from cache.
  #
  # Returns nothing.
  @loadReasonsFromCache: ->
    reasons = CACHE.getAll(@keys)
    @all[k].loadReason(reasons[k]) for k in @keys

  # Dumps all reasons to cache.
  #
  # Returns nothing.
  @dumpReasonsToCache: ->
    reasons = {}
    reasons[k] = JSON.stringify(@all[k]._reason) for k in @keys when @all[k]._reason?
    CACHE.putAll reasons, CACHE_EXPIRY

  # Instantiate a new Message object.
  #
  # Returns nothing.
  constructor: (@_message) ->
    @id  = @_message.getId()
    @key = "octogas:v#{CACHE_VERSION}:message_reason:#{@id}"
    Message.all[@key] = @
    Message.keys.push @key

  # Get the reason for us receiving this message.
  #
  # Returns an Object where the key is the name of the reason and the value is
  # more information about the reason.
  reason: ->
    @_reason ||=
      switch @headers()['X-GitHub-Reason']
        when 'mention'
          {mention: true}
        when 'team_mention'
          {team_mention: @teamMention() || true}
        when 'author'
          {author: true}
        else
          switch @from()
            when "notifications@github.com"
              {watching: @firstNameInHeader('List-ID') || true}
            when "noreply@github.com"
              {meta: true}
            else
              {}

  # Loads the cached reason from a String.
  #
  # reason - A stringified reason
  #
  # Returns nothing.
  loadReason: (reason) ->
    @_reason = JSON.parse(reason) if reason?

  # Finds mentions of any team that I'm on.
  #
  # Returns an string team name or undefined.
  teamMention: ->
    @_teamMention ||= if message = @_message.getPlainBody()
      if match = message.match(MY_TEAMS_REGEX)
        match[1]

  # Who is this message from.
  #
  # Returns a String email address.
  from: ->
    @_from ||= @firstAddressInHeader 'From'

  # Get the email address out of a header field like "From: Foo Bar <foobar@gmail.com>"
  #
  # header - The name of the header to parse.
  #
  # Retruns a String or undefined.
  firstAddressInHeader: (header) ->
    @headers()[header]?.match(/.*? <(.*)>/)?[1]

  # The the name our of an address header like "From: Foo Bar <foobar@gmail.com>"
  #
  # header - The name of the header to parse.
  #
  # Retruns a String or undefined.
  firstNameInHeader: (header) ->
    (@headers()[header].match(/(.*?) <.*>/) || [])[1]

  # Load the SMTP headers from the raw message into an Object.
  #
  # Returns an Object.
  headers: ->
    unless @_headers?
      @_headers = {}

      # Headers and body are separated by double newline.
      parts = @_message.getRawContent().split "\r\n\r\n", 2

      for line in parts[0].split "\r\n"
        # This line is a continuation of the previous line.
        if match = line.match /^\s+(.*)/
          value += " " + match[1]
        else
          # Save the previous line.
          @setHeader(@_headers, key, value) if key? and value?
          [key, value] = line.split ": ", 2

      # Save the last header.
      @setHeader(@_headers, key, value) if key? and value?

    @_headers

  # Set a header value. If the header is already set, make it an Array.
  #
  # headers - The Object on which to set the header value.
  # key     - The header name.
  # value   - The value to set.
  #
  # Returns nothing.
  setHeader: (headers, key, value) ->
    if Array.isArray headers[key]
      headers[key].push value
    else if headers[key]?
      headers[key] = [headers[key], value]
    else
      headers[key] = value

# Find all GitHub notifications in inbox and label them appropriately.
Label.loadPersisted()
Thread.loadFromSearch QUERY
Thread.loadDoneFromCache()
Message.loadReasonsFromCache()
try
  Thread.labelAllForReason()
  Thread.archiveAll() if SHOULD_ARCHIVE
catch error
  Logger.log error
finally
  try
    Label.applyAll()
  catch
    Logger.log error
  finally
    Thread.dumpDoneToCache()
    Message.dumpReasonsToCache()
