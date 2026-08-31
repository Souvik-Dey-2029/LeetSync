<h1 align="center">
  <a href="https://github.com/Souvik-Dey-2029/LeetSync">
    <img src="assets/octocode.png" alt="LeetSync - Automatically sync your code to your own GitHub repository." width="400">
  </a>
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

Building a visible history of Data Structures & Algorithms problem-solving on GitHub is a useful way to maintain and showcase consistent practice. However, manually copying solution code, creating organized directory structures, and writing problem descriptions can become tedious.

LeetSync automates this workflow directly from your browser without relying on third-party backend servers, remote databases, or shared OAuth applications.

```text
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
                    │
                    ▼
          Your GitHub Repository
```

---

## Key Features

### ✅ Implemented & Verified

* **Privacy-First Architecture**: 100% client-side operation with zero LeetSync backend servers or databases. Authentication tokens and user preferences remain stored inside the browser's extension storage.

* **GitHub OAuth Device Flow**: Secure authentication through GitHub's official Device Flow. Each user configures their own public OAuth Client ID. No Client Secret is required or stored by LeetSync.

* **Repository Setup & Linking**: Create a new GitHub repository directly from the extension dashboard or link an existing repository.

* **Interactive Submission Confirmation**: After an accepted LeetCode submission, LeetSync asks whether the submission should be synchronized to GitHub, giving the user control over what gets committed.

* **Language-Based Repository Hierarchy**: Solutions are automatically organized first by programming language and then by difficulty:

  ```text
  <Language>/<Difficulty>/<Problem>/
  ```

* **Multiple Solution Support**: When submitting another approach for an existing problem in the same language, LeetSync allows the user to either **Add Another Solution** or **Replace Existing Solution**.

* **Automatic README Generation**: Creates a `README.md` inside each problem directory containing the problem title, difficulty, description, and topic information.

* **Duplicate & Race Condition Protection**: Performs GitHub checks to avoid unnecessary duplicate uploads and protects against rapid repeated submissions.

* **Dashboard & Solved Statistics**: Provides a dashboard for tracking solved-problem statistics and repository status.

* **Cross-Browser Support**: Manifest V3-compatible builds are generated for Chrome and Firefox.

---

## Repository Folder Structure

LeetSync uses a language-first directory structure in the connected GitHub repository.

```text
├── Java/
│   ├── Easy/
│   │   └── 0001-two-sum/
│   │       ├── README.md
│   │       ├── solution.java
│   │       └── solution-2.java
│   ├── Medium/
│   └── Hard/
│
├── Python/
│   ├── Easy/
│   │   └── 0001-two-sum/
│   │       ├── README.md
│   │       └── solution.py
│   ├── Medium/
│   └── Hard/
│
├── C++/
│   ├── Easy/
│   ├── Medium/
│   └── Hard/
│
├── JavaScript/
│   ├── Easy/
│   ├── Medium/
│   └── Hard/
│
├── stats.json
└── README.md
```

### Example

A Java solution:

```text
Java/Easy/0001-two-sum/
├── README.md
└── solution.java
```

Another Java approach:

```text
Java/Easy/0001-two-sum/
├── README.md
├── solution.java
└── solution-2.java
```

The same problem solved in Python is stored separately:

```text
Python/Easy/0001-two-sum/
├── README.md
└── solution.py
```

This keeps solutions for different programming languages separated while maintaining the Easy / Medium / Hard organization.

---

## GitHub Authentication Setup

LeetSync does **not** use a central developer server or shared OAuth credentials.

**Each user must configure their own GitHub OAuth Application Client ID and authenticate their own GitHub account. LeetSync does not contain or share the author's GitHub credentials, access tokens, or authentication session.**

### Step-by-Step Setup

1. Go to your GitHub account settings:

   [GitHub Developer Settings](https://github.com/settings/developers)

2. Open **OAuth Apps** → **New OAuth App**.

3. Register a new application.

   Example name:

   ```text
   My LeetSync Extension
   ```

4. Set the required application URLs:

   ```text
   Homepage URL:
   https://github.com/

   Authorization callback URL:
   https://github.com/
   ```

   These URLs are required by GitHub's OAuth App form but are not used as the callback mechanism by the Device Flow.

5. Enable **Device Flow** in your OAuth App settings.

6. Copy the generated **Client ID**.

7. Open the LeetSync extension options/settings and enter **your own Client ID**.

8. Click **Connect GitHub Account**.

9. LeetSync will display an 8-character device code.

10. Approve the authentication request on GitHub.

After authentication, the extension uses the authenticated user's GitHub account for repository operations.

> **Important:** Never share or publish a GitHub access token or Client Secret. LeetSync does not require a Client Secret for Device Flow authentication.

---

## Installation from Source

### Prerequisites

* **Node.js**: v18.x or higher
* **npm**: v9.x or higher

### Build Instructions

1. Clone the repository:

   ```bash
   git clone https://github.com/Souvik-Dey-2029/LeetSync.git
   cd LeetSync
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Build the production extension:

   ```bash
   npm run build
   ```

   This generates ready-to-load extension bundles in:

   ```text
   dist/chrome
   dist/firefox
   ```

4. Load the Chrome build:

   * Open Chrome.

   * Navigate to:

     ```text
     chrome://extensions
     ```

   * Enable **Developer mode**.

   * Click **Load unpacked**.

   * Select:

     ```text
     dist/chrome
     ```

5. Configure your own GitHub OAuth Client ID and authenticate your GitHub account using the setup instructions above.

---

## Development & Testing

### Available npm Scripts

| Script      | Command          | Description                                         |
| ----------- | ---------------- | --------------------------------------------------- |
| Build       | `npm run build`  | Builds Chrome and Firefox production bundles        |
| Development | `npm run dev`    | Watches and rebuilds the project during development |
| Tests       | `npm test`       | Executes the Jasmine unit test suite                |
| Format      | `npm run format` | Formats project source files                        |
| Lint        | `npm run lint`   | Runs ESLint analysis                                |

### Running Tests

LeetSync uses [Jasmine](https://jasmine.github.io/) for automated testing.

Run:

```bash
npm test
```

The test suite covers areas including:

* Submission synchronization
* Interactive sync confirmation
* Duplicate protection
* Multiple solution handling
* Language-based repository organization
* README generation
* Path utilities
* GitHub API-related logic
* Race-condition protection

---

## Project Architecture

```text
LeetSync/
├── manifest-chrome.json       # Chrome Manifest V3 configuration
├── manifest-firefox.json      # Firefox Manifest V3 configuration
├── webpack.config.js          # Build configuration
├── options.html               # GitHub Client ID & authentication settings
├── popup.html                 # Extension popup interface
├── welcome.html               # Dashboard interface
│
├── css/
│   ├── options.css
│   ├── popup.css
│   └── welcome.css
│
├── scripts/
│   ├── background.js          # Extension background service worker
│   ├── githubDeviceAuth.js    # GitHub OAuth Device Flow client
│   ├── options.js             # Options page controller
│   ├── popup.js               # Popup controller
│   ├── welcome.js             # Dashboard controller
│   │
│   └── leetcode/
│       ├── leetcode.js        # Core synchronization engine
│       ├── modal.js            # Confirmation and solution-choice modals
│       ├── readmeTopics.js    # README/problem metadata generation
│       ├── submitBtn.js       # LeetCode submission listener
│       ├── util.js             # Path and language utilities
│       └── versions.js          # LeetCode UI/GraphQL adapters
│
└── spec/
    └── ...                    # Jasmine test specifications
```

---

## Roadmap

### ⏳ Planned Features

* **Historical Submission Batch Sync**: Synchronize previously accepted LeetCode submissions in bulk.
* **Enhanced GFG/HackerRank Integrations**: Expand synchronization to additional coding platforms.
* **Language-Specific Repository Views**: Further customization of repository organization and filtering.

---

## Limitations

* **DOM Dependency**: LeetSync relies on LeetCode's web DOM and GraphQL structures. Significant changes to LeetCode's frontend may require extension updates.

* **GitHub API Rate Limits**: GitHub API requests are subject to GitHub's standard rate limits.

* **User OAuth Configuration**: Because LeetSync does not use a shared OAuth application, each user must configure their own GitHub OAuth Client ID.

---

## Privacy & Security

* **Local Storage**: Authentication tokens and user settings are stored in the browser's private extension storage.

* **Direct API Communication**: LeetSync communicates directly with GitHub and LeetCode. No intermediate LeetSync backend server handles user credentials or solution code.

* **No Shared GitHub Credentials**: Every user authenticates their own GitHub account.

* **No Client Secret**: GitHub Device Flow does not require LeetSync to distribute or store an OAuth Client Secret.

* **No Analytics Backend**: LeetSync does not rely on a separate analytics or telemetry server for synchronization.

---

## Disclaimer

LeetSync is an independent open-source project and is not affiliated with, maintained, authorized, endorsed, or sponsored by LeetCode or GitHub.

---

## License & Attribution

LeetSync is released under the [MIT License](./LICENSE).

This project originated as a fork/rebuild of [LeetHub 2.0](https://github.com/arunbhardwaj/LeetHub-2.0) by Arun Bhardwaj.

All original MIT licensing and copyright requirements have been preserved.

---

## Author

**Souvik Dey**

* GitHub: [@Souvik-Dey-2029](https://github.com/Souvik-Dey-2029)
