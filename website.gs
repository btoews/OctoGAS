
  var authCallback, doGet, installTrigger, triggerIsInstalled, uninstallTrigger;

  function doGet(req) {
    var githubService, output, template;
    template = HtmlService.createTemplateFromFile("index");
    githubService = template.githubService = getGitHubService();
    template.muterState = triggerIsInstalled("muter") ? "installed" : "uninstalled";
    if (fetchCachedGitHubTeamSlugs() === "err") {
      template.lablerState = "not-authorized";
    } else if (triggerIsInstalled("labler")) {
      template.lablerState = "installed";
    } else {
      template.lablerState = "uninstalled";
    }
    output = template.evaluate();
    output.setSandboxMode(HtmlService.SandboxMode.NATIVE);
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
    var i, len, results, trigger, triggers;
    triggers = ScriptApp.getProjectTriggers();
    results = [];
    for (i = 0, len = triggers.length; i < len; i++) {
      trigger = triggers[i];
      if (trigger.getEventType() === ScriptApp.EventType.CLOCK && trigger.getHandlerFunction() === name) {
        results.push(ScriptApp.deleteTrigger(trigger));
      } else {
        results.push(void 0);
      }
    }
    return results;
  };

  function triggerIsInstalled(func) {
    var i, len, trigger, triggers;
    triggers = ScriptApp.getProjectTriggers();
    for (i = 0, len = triggers.length; i < len; i++) {
      trigger = triggers[i];
      if (trigger.getEventType() === ScriptApp.EventType.CLOCK && trigger.getHandlerFunction() === func) {
        return true;
      }
    }
    return false;
  };


