# Handle a GET request to the site.
doGet = (req) ->
  template = HtmlService.createTemplateFromFile "index"
  githubService = template.githubService = getGitHubService()

  # Check state of muter function trigger.
  template.muterState = if triggerIsInstalled("muter") then "installed" else "uninstalled"

  # Check state of labler function trigger.
  if fetchCachedGitHubTeamSlugs() == "err"
    template.lablerState = "not-authorized"
  else if triggerIsInstalled "labler"
    template.lablerState = "installed"
  else
    template.lablerState = "uninstalled"

  output = template.evaluate()
  output.setSandboxMode HtmlService.SandboxMode.NATIVE
  output

# Get a token from the auth code returned from GitHub.
authCallback = (req) ->
  githubService = getGitHubService()
  githubService.handleCallback req
  doGet req

# Install trigger by name.
installTrigger = (name) ->
  ScriptApp.newTrigger(name).timeBased().everyMinutes(30).create()

# Uninstall a trigger by name.
uninstallTrigger = (name) ->
  triggers = ScriptApp.getProjectTriggers()
  for trigger in triggers
    if trigger.getEventType() == ScriptApp.EventType.CLOCK && trigger.getHandlerFunction() == name
      ScriptApp.deleteTrigger trigger

# Check if trigger is already installed for a function.
triggerIsInstalled = (func) ->
  triggers = ScriptApp.getProjectTriggers()
  for trigger in triggers
    if trigger.getEventType() == ScriptApp.EventType.CLOCK && trigger.getHandlerFunction() == func
      return true
  false
