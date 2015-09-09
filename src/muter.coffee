# Search that is run to find new message to unsubscribe from.
QUERY = "is:mute AND
         (
           from:\"notifications@github.com\" OR
           from:\"noreply@github.com\"
         )"

# Header containing unsubscribe URL.
UNSUB_HEADER = "List-Unsubscribe"

# Prefix of unsubscribe URL.
UNSUB_URL_PREFIX = "https://github.com/notifications/unsubscribe"

# Regex for extracting unsubscribe URL from List-Unsubscribe header.
UNSUB_URL_REGEX = new RegExp "<(#{UNSUB_URL_PREFIX}/.*?)>"

# Extra options for the UrlFetchApp.fetch request to GitHub.com
FETCH_OPTIONS =
  muteHttpExceptions: true # Get erronious HTTP responses.

class Thread
  @all     = {}
  @ids     = []

  # Load threads from a given search query.
  #
  # query - The search query to run.
  #
  # Returns an Array of Threads.
  @loadFromSearch: (query) ->
    threads = GmailApp.search query

    # Preload all the messages to speed things up.
    GmailApp.getMessagesForThreads threads
    new Thread(t) for t in threads

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
    @subject = @_thread.getFirstMessageSubject()

  # Unsubscribes from the GitHub conversation and unmutes the thread if the
  # unsubscribe was successful.
  #
  # Returns true if the operation was successful, false otherwise.
  unsubscribeAndUnmute: ->
    !!(@unsubscribe() && @unmute())

  # Unsubscribe from the issue/PR on GitHub.com.
  #
  # Returns true if the request was successful or if there was no unsubscribe
  # url false otherwise.
  unsubscribe: ->
    if url = @unsubUrl()
      if res = UrlFetchApp.fetch url, FETCH_OPTIONS
        if res.getResponseCode() == 200
          true
        else
          false
      else
        false
    else
      true

  # Extracts the unsubscribe URL from the first message's headers.
  #
  # Returns a String or undefined.
  unsubUrl: ->
    @messages[0].unsubUrl() if @messages.length > 0

  # Unmutes the thread by moving it to the inbox and then to the archive.
  #
  # Returns true.
  unmute: ->
    @moveToInbox()
    @moveToArchive()
    true

  # Move the thread to the inbox.
  #
  # Returns nothing.
  moveToInbox: ->
    @_thread.moveToInbox()

  # Move the thread to the archive.
  #
  # Returns nothing.
  moveToArchive: ->
    @_thread.moveToArchive()

class Message
  # Instantiate a new Message object.
  #
  # Returns nothing.
  constructor: (@_message) ->

  # Extract the unsubscribe URL from the messages headers.
  #
  # Returns a String or undefined.
  unsubUrl: ->
    if raw = @headers()[UNSUB_HEADER]
      for value in raw.split ", "
        if match = value.match UNSUB_URL_REGEX
          return match[1]

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

# Find all muted GitHub conversations and unsubscribe from them
Thread.loadFromSearch QUERY
Thread.all[id].unsubscribeAndUnmute() for id in Thread.ids
