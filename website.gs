
  var authCallback, doGet, installTrigger, triggerIsInstalled, uninstallTrigger;

  function doGet(req) {
    var githubService, output, template;
    template = HtmlService.createTemplateFromFile("index");
    githubService = template.githubService = getGitHubService();
    template.muterState = triggerIsInstalled("muter") ? "installed" : "uninstalled";
    if (triggerIsInstalled("labler")) {
      template.lablerState = "installed";
    } else if (fetchCachedGitHubTeamSlugs() !== "err") {
      Logger.log(fetchCachedGitHubTeamSlugs());
      template.lablerState = "uninstalled";
    } else {
      template.lablerState = "not-authorized";
    }
    output = template.evaluate();
    output.setSandboxMode(HtmlService.SandboxMode.IFRAME);
    return output;
  };

  function authCallback(req) {
    var githubService;
    githubService = getGitHubService();
    githubService.handleCallback(req);
    return doGet(req);
  };

  function installTrigger(name) {
    return ScriptApp.newTrigger(name).timeBased().everyMinutes(10).create();
  };

  function uninstallTrigger(name) {
    var trigger, triggers, _i, _len, _results;
    triggers = ScriptApp.getProjectTriggers();
    _results = [];
    for (_i = 0, _len = triggers.length; _i < _len; _i++) {
      trigger = triggers[_i];
      if (trigger.getEventType() === ScriptApp.EventType.CLOCK && trigger.getHandlerFunction() === name) {
        _results.push(ScriptApp.deleteTrigger(trigger));
      } else {
        _results.push(void 0);
      }
    }
    return _results;
  };

  function triggerIsInstalled(func) {
    var trigger, triggers, _i, _len;
    triggers = ScriptApp.getProjectTriggers();
    for (_i = 0, _len = triggers.length; _i < _len; _i++) {
      trigger = triggers[_i];
      if (trigger.getEventType() === ScriptApp.EventType.CLOCK && trigger.getHandlerFunction() === func) {
        return true;
      }
    }
    return false;
  };


