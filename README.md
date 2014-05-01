# OctoGAS - GitHub Google Apps Script

Creates/maintains Gmail labels based on GitHub notification metadata.

Adds messages to folders based on the reason for the notification. It will create/manage labels for:

- Author of the Issue/Pull Request
- Direct `@mentions`
- Team `@mentions`
- Watched repositories
- Meta notifications (added to team, SSH key added, etc...)

# Instalation

- Go to https://script.google.com/d/1yTtQ4bGlpsuv3lp0pWLmArzEbya4bvi_ABJ3Jn9NR8iDSAXZSwd3ynjh/edit
- Go to "File > Make Copy..."
- Adjust the `MY_TEAMS` variable to list GitHub teams that you care about.
- Go to "Resources > Current Project's Triggers"
- Create a new trigger to run the `main` function however often you want.

# Hacking

You can build the source by running `script/compile`. The generated output in `octogas.gs` can be coppied directly into a Google Apps Script.
