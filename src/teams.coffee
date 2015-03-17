githubTeamSlugs = false

# Load GitHub teams from cache, from GitHub API otherwise.
fetchCachedGitHubTeamSlugs = ->
  Logger.log "Trying to load GitHub teams from cache"
  if githubTeamSlugs
    Logger.log "fetchCachedGitHubTeamSlugs: local cache hit"
  else
    cache = CacheService.getUserCache()
    cachedSlugs = cache.get "github-team-slugs"
    if cachedSlugs
      githubTeamSlugs = JSON.parse cachedSlugs
      Logger.log "fetchCachedGitHubTeamSlugs: cache hit"
    else
      Logger.log "fetchCachedGitHubTeamSlugs: cache miss"
      slugs = loadGitHubTeams()
      return "err" if slugs == "err"
      githubTeamSlugs = slugs
      cache.put "github-team-slugs", JSON.stringify(slugs), 3600
  Logger.log JSON.stringify(githubTeamSlugs)
  githubTeamSlugs

# Load the user's teams from the GitHub API.
loadGitHubTeams = ->
  Logger.log "loadGitHubTeams: Loading GitHub teams from the API"
  githubService = getGitHubService()

  if !githubService.hasAccess() || !githubService.getAccessToken()
    Logger.log "loadGitHubTeams: Missing Oauth authorization"
    return "err"

  response = UrlFetchApp.fetch "https://api.github.com/user/teams",
    headers:
      Authorization: "token #{githubService.getAccessToken()}"

  if response.getResponseCode() != 200
    Logger.log "loadGitHubTeams: Non 200 response from the GitHub API"
    return "err"

  teams = JSON.parse response.getContentText()
  teamSlugs = ("@#{t["organization"]["login"]}/#{t["slug"]}" for t in teams)
  Logger.log "loadGitHubTeams: Loaded teams from GitHub API."
  teamSlugs

# Oauth service for GitHub.com.
getGitHubService = ->
  OAuth2.createService('github')
    .setAuthorizationBaseUrl('https://github.com/login/oauth/authorize')
    .setTokenUrl('https://github.com/login/oauth/access_token')
    .setClientId(githubClientId())
    .setClientSecret(githubClientSecret())
    .setProjectKey('M0FjeQ5yKTbPoxSB2lDmzPjxjc-ysB9lY')
    .setCallbackFunction('authCallback')
    .setPropertyStore(PropertiesService.getUserProperties())
    .setScope('read:org')

# Oauth client ID for GitHub.com.
githubClientId = ->
  PropertiesService.getScriptProperties().getProperty("github_client_id")

# Oauth client secret for GitHub.com.
githubClientSecret = ->
  PropertiesService.getScriptProperties().getProperty("github_client_secret")

# Remove cached GitHub authorization for testing.
resetGitHubAuthorization = ->
  githubService = getGitHubService()
  githubService.reset()
