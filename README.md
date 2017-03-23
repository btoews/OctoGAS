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

You can build the source by running `script/compile`. The generated output can be copied directly into a Google Apps Script project.

After copying the project or copying the built artifacts into a new project, take the following steps to get it running:

 - Register a [new OAuth application](https://github.com/settings/developers)
 - Select the "**Resources**" menu, then "**Libraries...**". Add the OAuth2 library using this key: `1B7FSrk5Zi6L1rSxxTDgDEUsPzlukDsi4KGuTMorsTQHhGBzBkMun4iDF`. Use version 7. 
 - In your GAS project, select "**File > Project Properties...**", and then the **Script Properties** tab. Add properties entitled `github_client_secret` & `github_client_id`and set them to the corresponding values from the OAuth application page that you just created. 
 - Go back to the **Info** tab and copy the value for **Project key (Deprecated)**. You'll need this in a couple of places.
 - Pull up the `teams.gs` file, and look for the line that begins `return OAuth2.createService` - examine this line for the call to `setProjectKey()`. Insert the aforementioned project key here.
 - Go back to your OAuth app settings page on GitHub. Set the callback URL to `https://script.google.com/macros/d/<projectKey>/usercallback`. 
 - You should now be ready to deploy the project as a web app, and go through the installation procedure.
