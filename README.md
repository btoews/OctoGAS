## GitHub notifications Google Apps Script

Creates/maintains Gmail labels based on GitHub notification metadata.

Adds messages to folders based on the reason for the notification. It will create/manage labels for:

- Author of the Issue/Pull Request
- Direct `@mentions`
- Team `@mentions`
- Watched repositories
- Meta notifications (added to team, SSH key added, etc...)

### Installation

Because Google Apps Scripts run on Google's infrastructure, you will need to set this script up to run on Google Scripts.

1. Go [here](https://script.google.com/d/1yTtQ4bGlpsuv3lp0pWLmArzEbya4bvi_ABJ3Jn9NR8iDSAXZSwd3ynjh/edit)
1. Go to "File > Make Copy..."
1. Adjust the `MY_TEAMS` variable to list GitHub teams that you care about.
1. Go to "Resources > Current Project's Triggers"
1. Create a new trigger to run the `main` function however often you want.

### Hacking

You can build the source by running `script/compile`. The generated output in `octogas.gs` can be coppied directly into a Google Apps Script.
