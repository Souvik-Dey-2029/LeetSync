# LeetSync

> **Automatically sync your accepted LeetCode solutions to your own GitHub repository.**

LeetSync is a Chrome extension that connects **LeetCode** with **your GitHub account** and automatically saves your accepted coding solutions to a GitHub repository.

Instead of manually copying your LeetCode solutions, creating files, writing documentation, and committing them yourself, LeetSync handles the synchronization automatically.

The project is designed as a **local-first tool**. Your GitHub authentication belongs to you, and no personal GitHub token needs to be stored on an external server.

---

## ✨ Features

### 🔐 Personal GitHub Authentication

LeetSync uses GitHub authentication to connect the extension to your own account.

Each installation can use its **own GitHub OAuth configuration**, meaning users don't need to authenticate through the developer's GitHub account.

Authentication data is stored locally using Chrome extension storage.

---

### 🔄 Automatic LeetCode → GitHub Sync

When you successfully solve a LeetCode problem:

```text
Solve Problem
     ↓
Submit
     ↓
Accepted ✅
     ↓
LeetSync detects submission
     ↓
Solution synced to GitHub
```

Your accepted solution is automatically added to your configured repository.

---

### 📁 Organized Repository Structure

LeetSync is designed to keep your solutions organized by difficulty.

Example:

```text
LeetCode-Solutions/
│
├── Easy/
│   ├── Two-Sum/
│   │   ├── README.md
│   │   └── solution.java
│   │
│   └── Valid-Palindrome/
│       ├── README.md
│       └── solution.java
│
├── Medium/
│   └── Add-Two-Numbers/
│       ├── README.md
│       └── solution.java
│
└── Hard/
```

This makes the repository useful not only for GitHub activity, but also for revising DSA problems later.

---

### 📝 Problem Documentation

Each synchronized problem can contain a README with information such as:

* Problem title
* LeetCode problem number
* Difficulty
* Problem description
* Approach
* Complexity
* Programming language
* Solution reference

Example:

```text
Two Sum
├── README.md
└── solution.java
```

---

### 👨‍💻 Your Code, Your GitHub

The repository belongs to **your GitHub account**.

LeetSync does not require users to send their GitHub credentials to the developer.

The intended architecture is:

```text
Your Chrome
     │
     ▼
  LeetSync
     │
     ├── LeetCode
     │
     └── GitHub API
             │
             ▼
       Your GitHub Repo
```

No central LeetSync backend is required.

---

## 🚧 Upcoming Features

LeetSync is currently under active development.

### Duplicate Problem Detection

If a problem has already been synchronized, submitting the same problem again will not create another duplicate entry.

The system will identify problems using their LeetCode problem identifier/slug.

```text
Two Sum
   ↓
Already synchronized?
   ↓
YES → Skip duplicate
```

---

### 📄 Automatic PDF Generation

Future versions will generate a PDF containing the problem documentation and corresponding solution.

Planned structure:

```text
Two-Sum/
├── README.md
├── solution.java
└── problem.pdf
```

---

### 🌐 Multi-Language Support

The extension is designed to support solutions written in different programming languages, including:

* Java
* Python
* C++
* C
* JavaScript
* and other LeetCode-supported languages

---

## 🛠️ Tech Stack

* **JavaScript**
* **HTML5**
* **CSS3**
* **Chrome Extensions – Manifest V3**
* **Webpack**
* **GitHub REST API**
* **GitHub OAuth Device Flow**
* **LeetCode**
* **Jasmine** for testing

---

## 🚀 Getting Started

### Prerequisites

You need:

* Google Chrome
* Node.js
* npm
* A GitHub account
* A GitHub OAuth App with Device Flow enabled

---

### 1. Clone the repository

```bash
git clone https://github.com/Souvik-Dey-2029/LeetSync.git
cd LeetSync
```

---

### 2. Install dependencies

```bash
npm install
```

---

### 3. Build the extension

```bash
npm run build
```

The production build will be generated inside:

```text
dist/chrome/
```

---

### 4. Load the extension into Chrome

Open:

```text
chrome://extensions
```

Then:

1. Enable **Developer mode**
2. Click **Load unpacked**
3. Select:

```text
dist/chrome/
```

LeetSync should now appear in your installed extensions.

---

## 🔑 GitHub Configuration

LeetSync uses GitHub authentication so that every user can connect their own GitHub account.

Create a GitHub OAuth App from:

**GitHub → Settings → Developer settings → OAuth Apps**

Enable **Device Flow** for the application.

Copy the generated **Client ID** and enter it in the LeetSync Options page.

> **Never commit GitHub tokens, secrets, passwords, or other credentials to this repository.**

---

## 🔒 Privacy

LeetSync is designed around a local-first architecture.

### What LeetSync needs

* Access to the LeetCode page to detect submissions
* GitHub authentication to access your repository
* Permission to create/update files in the repository you choose

### What LeetSync does not require

* A LeetSync backend
* A LeetSync database
* A cloud server storing your GitHub token
* Sharing your GitHub password

Your authentication credentials are handled locally by the extension.

---

## 🧪 Development

Build the project:

```bash
npm run build
```

Run the test suite:

```bash
npm test
```

The project uses Webpack to bundle the extension components.

---

## 📂 Project Structure

```text
LeetSync/
│
├── scripts/
│   ├── background.js
│   ├── popup.js
│   ├── githubDeviceAuth.js
│   ├── options.js
│   ├── welcome.js
│   └── leetcode/
│
├── css/
├── options.html
├── popup.html
├── manifest-chrome.json
├── manifest-firefox.json
├── webpack.config.js
├── package.json
├── LICENSE
└── README.md
```

---

## ⚠️ Disclaimer

LeetSync is an independent project and is not affiliated with or endorsed by LeetCode or GitHub.

The project uses publicly available APIs and browser-side functionality to automate synchronization between a user's LeetCode activity and their own GitHub repository.

---

## 📜 License

This project is released under the **MIT License**.

See the [`LICENSE`](LICENSE) file for details.

---

## 👨‍💻 Author

**Souvik Dey**

GitHub: [@Souvik-Dey-2029](https://github.com/Souvik-Dey-2029)

---

## ⭐ Project Status

**Active Development**

Current:

* ✅ GitHub authentication
* ✅ Local authentication storage
* ✅ GitHub repository creation/linking
* ✅ LeetCode → GitHub synchronization
* ✅ Chrome Manifest V3 build
* ⏳ Duplicate problem detection
* ⏳ Automatic PDF generation
* ⏳ Additional customization and polishing

More features are being developed as the project evolves.
