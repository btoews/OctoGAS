// Handle a GET request to the site.
function doGet() {
  output = HtmlService.createHtmlOutputFromFile("index");
  return output;
}

// Install muter trigger.
function installMuterTrigger() {
  ScriptApp.newTrigger("muter").timeBased().everyMinutes(10).create();
}

// Uninstall muter trigger.
function uninstallMuterTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (i = 0; i < triggers.length; i++) {
    var trigger = triggers[i];
    if (trigger.getEventType() == ScriptApp.EventType.CLOCK && trigger.getHandlerFunction() == "muter") {
      ScriptApp.deleteTrigger(trigger);
    }
  }
}

// Check if trigger is already installed for muter function.
function muterTriggerIsInstalled() {
  var triggers = ScriptApp.getProjectTriggers();
  for (i = 0; i < triggers.length; i++) {
    var trigger = triggers[i];
    if (trigger.getEventType() == ScriptApp.EventType.CLOCK && trigger.getHandlerFunction() == "muter") {
      return true;
    }
  }
  return false;
}
