<h1 align="center">
  <a href="https://standardjs.com"><img src="assets/octocode.png" alt="LeetSync - Automatically sync your code to your own GitHub repository." width="400"></a>
  <br>
  LeetSync - Automatically sync your code to your own GitHub repository.
  <br>
  <br>
</h1>

<p align="center">
  <a href="./LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="license"/>
  </a>
</p>

## What is LeetSync?
<p>A Chrome (Manifest V3) extension that automatically pushes your code to <strong>your own</strong> GitHub repository when you pass all tests on a <a href="https://leetcode.com/">LeetCode</a> problem. LeetSync is a privacy-focused fork/rebuild of the open-source <a href="https://github.com/arunbhardwaj/LeetHub-2.0">LeetHub 2.0</a> project: every installation authenticates its own GitHub account via GitHub's OAuth Device Flow, using an OAuth App the installer creates and controls themselves. There is no shared developer account, no bundled client secret, and no backend server operated by the extension author.</p>

## Why LeetSync?
<p> <strong>1.</strong> Recruiters <em>want</em> to see your contributions to the open-source community, be it through side projects, solving algorithms/data-structures, or contributing to existing projects.<br>
GitHub is developers' #1 portfolio. LeetSync makes it effortless (autonomous) to keep track of progress on the largest network of engineers, GitHub.</p>

<p> <strong>2.</strong> There's no easy way of accessing your LeetCode problems in one place! <br>
Pushing code manually to GitHub from LeetCode is time consuming — LeetSync automates it entirely.</p>

## How does LeetSync work?

<p>It's as simple as:</p>
<ol>
  <li>Install the extension, then create your own GitHub OAuth App (see "GitHub authentication setup" below) and enter its Client ID on the LeetSync settings page.</li>
  <li>Click "Connect GitHub Account" and approve access on GitHub's device activation page.</li>
  <li>Set up an existing/new repository with LeetSync (private by default) by clicking "Get Started".</li>
  <li>Begin LeetCoding! To view your progress, simply click on the extension icon.</li>
</ol>

## GitHub authentication setup (do this once per installation)

LeetSync has no server of its own, so each person who installs it authenticates with their *own* GitHub OAuth App:

1. Go to [github.com/settings/developers](https://github.com/settings/developers) → **OAuth Apps** → **New OAuth App**.
2. Fill in any Application name / Homepage URL.
3. Set **Authorization callback URL** to `https://github.com/` (required by GitHub's form, unused by the device flow).
4. After creating the app, open **Enable Device Flow** and turn it on.
5. Copy the **Client ID** and paste it into the extension's settings page (right-click the extension icon → Options, or the gear icon in the popup).
6. Click **Connect GitHub Account** and approve the request on GitHub.

No client secret is ever needed, generated, or stored by this extension.

## Attribution & License

LeetSync began as a fork of [LeetHub 2.0](https://github.com/arunbhardwaj/LeetHub-2.0) by Arun Bhardwaj, used and modified here under the terms of its [MIT License](./LICENSE). The original project's GitHub OAuth application, client credentials, and account-specific configuration have been removed and replaced with a per-installation authentication flow described above.

# How to set up LeetSync for local development?

  1. Clone this repo to your local machine
  2. Run `npm run setup` to install the developer dependencies
  3. Run `npm run build` to build the final extension files into the `./dist/` directory
  4. Go to <a href="chrome://extensions">chrome://extensions</a> or <a href="https://firefox-source-docs.mozilla.org/devtools-user/about_colon_debugging/index.html#extensions">about:debugging</a> in Firefox
     - In Chrome, enable [Developer mode](https://support.google.com/chrome/a/answer/2714278) by toggling the switch on the top right corner
  5. Click `Load unpacked` or `Load Temporary Add-on...`
  6. Select the `./dist/chrome` or `./dist/firefox` folder
  7. That's it! Be sure to `npm run build` and reload the extension after making changes

Other npm commands available:

```
npm run               Show list of commands available
npm run format        Auto-format JavaScript, HTML/CSS
npm run format-test   Test all code is formatted properly
npm run lint          Lint JavaScript
npm run lint-test     Test all code is linted properly
```
