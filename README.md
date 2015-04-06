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

#### Archive

Archives the messages after applying the labels. Disabled by default. Enable by setting `SHOULD_ARCHIVE` to `true`.

#### Mute

Finds muted Gmail threads from GitHub conversations and unsubscribes from the GitHub conversation. It then unmutes the Gmail Thread. The result is that GitHub's logic of re-subscribing on new @mentions is retained while taking advantage of Gmail's interface for muting conversations.

### Installation

OctoGAS can be installed to your Google account from the [OctoGAS website](https://script.google.com/macros/s/AKfycbyTt-wRFUb-O6WkoamJUPdAS8LMeQ-tbl_k2dIXP4WKAyGvlZr1/exec). This requires you to authorize OctoGAS to manage your Gmail messages. Installing the labler also requires you to authorize OctoGAS to access your GitHub account, so it knows which teams you are on.

![OctoGAS website](https://cloud.githubusercontent.com/assets/1144197/7011123/ac80c122-dc63-11e4-96da-090373e1be34.png)

You can also manually install OctoGAS by following the instructions in the [Hacking](#hacking) section.

### Hacking

Make your own copy of the Google Apps Script project by going [here](https://script.google.com/d/1yTtQ4bGlpsuv3lp0pWLmArzEbya4bvi_ABJ3Jn9NR8iDSAXZSwd3ynjh/edit) and selecting "File > Make Copy..." in the menu bar.

You can build the source by running `script/compile`. The generated output in `labler.gs` and `muter.gs` can be coppied directly into a Google Apps Script.
