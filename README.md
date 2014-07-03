## GitHub notifications Google Apps Script

### Features

#### Label

Creates/maintains Gmail labels based on GitHub notification metadata.

Adds messages to folders based on the reason for the notification. It will create/manage labels for:

- Author of the Issue/Pull Request
- Direct `@mentions`
- Team `@mentions`
- Watched repositories
- Meta notifications (added to team, SSH key added, etc...)

#### Mute

Finds muted Gmail threads from GitHub conversations and unsubscribes from the GitHub conversation. It then unmutes the Gmail Thread. The result is that GitHub's logic of re-subscribing on new @mentions is retained while taking advantage of Gmail's interface for muting conversations.

### Installation

Because Google Apps Scripts run on Google's infrastructure, you will need to set this script up to run on Google Scripts.

1. Go [here](https://script.google.com/d/1yTtQ4bGlpsuv3lp0pWLmArzEbya4bvi_ABJ3Jn9NR8iDSAXZSwd3ynjh/edit)
1. Go to "File > Make Copy..."
1. Adjust the `MY_TEAMS` variable in the `labler.gs` file to list GitHub teams that you care about. (i.e. ["@myorg/myteam"])
1. Go to "Resources > Current Project's Triggers"
1. Create a new trigger to run the `main` function of `labler.gs`, `muter.gs`, or both however often you want.

### Hacking

You can build the source by running `script/compile`. The generated output in `labler.gs` and `muter.gs` can be coppied directly into a Google Apps Script.
