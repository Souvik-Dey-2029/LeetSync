<h1 align="center">
  <a href="https://standardjs.com"><img src="assets/octocode.png" alt="LeetSync - Automatically sync your code to your own GitHub repository." width="400"></a>
  <br>
  LeetSync - Automatically sync your code to your own GitHub repository.
  <br>
  <br>
</h1>

<h1 align="center">
  <br>
  <strong>LeetSync</strong>
  <br>
  <em>Autonomous, privacy-focused LeetCode → GitHub synchronization tool</em>
  <br>
  <br>
</h1>

<p align="center">
  <a href="./LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License: MIT"/>
  </a>
  <img src="https://img.shields.io/badge/version-2.0.9-orange.svg" alt="Version 2.0.9"/>
  <img src="https://img.shields.io/badge/manifest-V3-green.svg" alt="Manifest V3"/>
</p>

---

## Overview

**LeetSync** is a local-first Chrome and Firefox browser extension (Manifest V3) that automatically synchronizes your accepted [LeetCode](https://leetcode.com/) submissions directly to your own GitHub repository.

Building a visible history of data structures & algorithms problem-solving on GitHub is one of the most effective ways for software engineers to demonstrate consistent practice to recruiters and open-source collaborators. However, manually copying solution code, creating organized directory structures, and writing markdown problem descriptions is tedious.

LeetSync automates the entire process seamlessly without relying on third-party backend servers, remote databases, or shared OAuth applications.

```
       LeetCode Submission (Accepted)
                     │
                     ▼
         Interactive Sync Modal
        [ Yes, Sync ] [ Don't Sync ]
                     │
                     ▼
                 LeetSync
        (Chrome Extension Engine)
                     │
                     ▼
      Language & Difficulty Hierarchy
         Your GitHub Repository
```

---

## Key Features

### ✅ Implemented & Verified

- **Privacy-First Architecture**: 100% client-side operation with zero LeetSync backend servers or databases. All OAuth tokens and user preferences remain stored inside your browser's `chrome.storage.local`.
- **GitHub OAuth Device Flow**: Secure authentication via GitHub's official RFC 8628 Device Flow. Users supply their own public OAuth Client ID—no client secrets are ever transmitted or stored.
- **Repository Setup & Linking**: Create a new private GitHub repository directly from the extension dashboard or link an existing repository.
- **Interactive Submission Confirmation**: Prompts you upon an accepted LeetCode submission (`Sync this submission to GitHub?`) so you retain complete control over what gets committed.
- **Language-Based Repository Hierarchy**: Automatically organizes solutions by programming language and difficulty level:
  ```
  <Language>/<Difficulty>/<NumericId-ProblemSlug>/
  ```
- **Multiple Solution Support**: When submitting multiple approaches for the same problem in the same language, LeetSync offers an interactive choice to **Add Another Solution** (saving as `problem-2.ext`, `problem-3.ext`) or **Replace Existing Solution**.
- **Automatic README Generation**: Creates detailed `README.md` files inside each problem folder featuring problem title, difficulty tag, formatted description HTML converted to markdown, and topic metadata.
- **Duplicate & Race Condition Protection**: Performs remote GitHub API checks to prevent redundant uploads and includes an in-flight upload guard to protect against rapid duplicate submissions.
- **Dashboard & Solved Statistics**: Real-time developer dashboard (`welcome.html`) tracking Total, Easy, Medium, and Hard solved counts with repository status management.
- **Cross-Browser Support**: Manifest V3 compliant bundle generation for both Chrome and Firefox browsers.

---

## Repository Folder Structure

LeetSync organizes your solutions in a clean, language-first directory structure at the root of your connected GitHub repository:

```
├── Java/
│   └── Easy/
│       └── 0001-two-sum/
│           ├── README.md
│           ├── two-sum.java
│           └── two-sum-2.java
├── Python3/
│   └── Medium/
│       └── 0003-longest-substring-without-repeating-characters/
│           ├── README.md
│           └── longest-substring-without-repeating-characters.py
├── C++/
│   └── Hard/
│       └── 0004-median-of-two-sorted-arrays/
│           ├── README.md
│           └── median-of-two-sorted-arrays.cpp
├── stats.json
└── README.md
```

---

## GitHub Authentication Setup

LeetSync does not use a central developer server or shared OAuth client secret. Each user configures their own GitHub OAuth Application Client ID once during installation.

### Step-by-Step Setup:

1. Navigate to your GitHub account settings: [github.com/settings/developers](https://github.com/settings/developers) → **OAuth Apps** → **New OAuth App**.
2. Register a new application with any name (e.g., `My LeetSync Extension`).
3. Set **Homepage URL** and **Authorization callback URL** to `https://github.com/` (required by GitHub's form, though unused by the Device Flow).
4. After saving, click **Enable Device Flow** under your OAuth App settings and turn it on.
5. Copy the generated **Client ID** (public identifier).
6. Right-click the LeetSync extension icon → **Options** (or click **Settings ⚙** in the popup/dashboard), paste your Client ID, and click **Save**.
7. Click **Connect GitHub Account**, copy the 8-character user code displayed by LeetSync, and approve the activation prompt on GitHub.

> **Note**: Device Flow authentication only uses a public Client ID. No Client Secret is required or stored.

---

## Installation from Source

### Prerequisites

- **Node.js**: v18.x or higher
- **npm**: v9.x or higher

### Build Instructions

1. Clone the repository:
   ```bash
   git clone https://github.com/Souvik-Dey-2029/LeetSync.git
   cd LeetSync
   ```

2. Install dependencies:
   ```bash
   npm run setup
   ```

3. Build production extension bundles:
   ```bash
   npm run build
   ```
   This generates ready-to-load extension bundles in `dist/chrome` and `dist/firefox`.

4. Load into Chrome:
   - Open Chrome and navigate to `chrome://extensions`.
   - Enable **Developer mode** using the toggle in the top-right corner.
   - Click **Load unpacked**.
   - Select the `./dist/chrome` directory.

---

## Development & Testing

### Available npm Scripts

| Script | Command | Description |
| :--- | :--- | :--- |
| `npm run build` | `webpack --mode=production` | Compiles extension bundles into `dist/chrome` and `dist/firefox`. |
| `npm run dev` | `webpack --mode=production --watch` | Recompiles automatically on source changes. |
| `npm test` | `jasmine` | Executes the unit test suite (29 specs). |
| `npm run format` | `prettier --write **/*.{js,css,html}` | Auto-formats codebase files. |
| `npm run lint` | `eslint **/*.{js,ts} --fix` | Runs ESLint analysis and fixes code style issues. |

### Running Tests

LeetSync uses [Jasmine](https://jasmine.github.io/) as its official test runner. To execute the automated unit test suite:

```bash
npm test
```

*All 29 unit test specs cover submission sync modal logic, duplicate problem protection remote API checks, README topic tag parsing, and path utility functions.*

---

## Project Architecture

```
LeetSync/
├── manifest-chrome.json     # Chrome Manifest V3 configuration
├── manifest-firefox.json    # Firefox Manifest V3 configuration
├── webpack.config.js        # Build configuration & asset pipeline
├── options.html             # Options page for GitHub Client ID & Auth
├── popup.html               # Extension popup interface
├── welcome.html             # Developer dashboard UI
├── css/
│   └── welcome.css          # Design system & 3D visual workspace styles
├── scripts/
│   ├── background.js        # Extension background service worker
│   ├── githubDeviceAuth.js  # OAuth Device Flow authorization client
│   ├── options.js           # Options page event handlers
│   ├── popup.js             # Extension popup controller
│   ├── welcome.js           # Dashboard controller & interactive stats
│   └── leetcode/
│       ├── leetcode.js      # Core synchronization engine & GitHub API client
│       ├── modal.js         # Confirmation & solution choice modal DOM handlers
│       ├── readmeTopics.js  # Problem description & topic markdown parser
│       ├── submitBtn.js     # LeetCode DOM submit listener
│       ├── util.js          # Path formatting & extension helper utilities
│       └── versions.js      # LeetCode UI V1 / V2 DOM & GraphQL adapters
└── spec/                    # Automated Jasmine unit testing framework
```

---

## Roadmap

### ⏳ Planned Features

- **Automated PDF Export**: Option to generate and upload PDF versions of problem descriptions alongside code solutions.
- **Historical Submission Batch Sync**: Bulk synchronization of past accepted submissions from LeetCode submission history.
- **Enhanced GFG/HackerRank Integrations**: Expanding the multi-platform sync engine.

---

## Limitations

- **DOM Dependency**: LeetSync relies on LeetCode's active web DOM and GraphQL endpoint structures. Significant changes to LeetCode's frontend may require extension updates.
- **GitHub API Rate Limits**: Unauthenticated or excessively frequent API requests are subject to standard GitHub REST API rate limits (5,000 requests/hour for authenticated user tokens).

---

## Privacy & Security

- **Local Storage**: All authentication tokens (`leetsync_token`) and user settings are stored strictly in your browser's private extension storage (`chrome.storage.local`).
- **Direct API Communication**: LeetSync communicates directly with `api.github.com` and `leetcode.com`. No intermediate proxy servers touch your code or credentials.
- **No Client Secrets**: Built using GitHub OAuth Device Flow, eliminating the need to hardcode or store sensitive application client secrets.

---

## Disclaimer

LeetSync is an independent open-source project and is not affiliated with, maintained, authorized, endorsed, or sponsored by LeetCode or GitHub.

---

## License & Attribution

LeetSync is released under the [MIT License](./LICENSE).

This project originated as a fork/rebuild of [LeetHub 2.0](https://github.com/arunbhardwaj/LeetHub-2.0) by Arun Bhardwaj. All original MIT licensing and copyright requirements have been preserved.

---

## Author

**Souvik Dey**  
- GitHub: [@Souvik-Dey-2029](https://github.com/Souvik-Dey-2029)
