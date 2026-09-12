# LeetCode Solutions — DSA Explorer & Blind 75 Tracker

An interactive, responsive single-page web dashboard to search, filter, and explore my LeetCode Data Structures & Algorithms solutions, complete with an automated **Blind 75 Progress Tracker**. Built with HTML5, Tailwind CSS, and Vanilla JavaScript.

## 🚀 Key Features

- **🎯 Blind 75 Tracker & Auto-Status**: Maintains the complete curated Blind 75 question list categorized by topics (Array, DP, Tree, Graph, etc.). As soon as a problem solution is pushed to [`rohitkr7/leetcode-solutions`](https://github.com/rohitkr7/leetcode-solutions), it is automatically detected and marked as **Solved** with interactive completion stats!
- **⚡ 1-Click Blind 75 Filter**: Instantly toggle between **All Solved Solutions** and **Blind 75 Only** from the navigation bar or quick filters to see your exact progress at a glance.
- **⚡ 100% Dynamic Auto-Sync**: The dashboard dynamically fetches the repository tree from GitHub via the Git Trees API and automated GitHub Actions workflow. Whenever you push a new solution folder (e.g. `0075-sort-colors/`), it immediately appears on the viewer without needing to edit any configuration!
- **📋 High-Density List / Table View**: Clean, compact table layout displaying problem numbers, titles, colored difficulty badges, topic tags, Blind 75 tags, status indicators, and action buttons.
- **🔍 Real-Time Search & Multi-Criteria Filtering**: Filter instantly by problem title, number, difficulty (`Easy`, `Medium`, `Hard`), status (`All`, `Solved`, `Unsolved`), and topics/categories.
- **💻 Interactive Code & Problem Viewer**: Clicking any solved row opens a modal that lazily fetches the problem statement (`README.md`) and the solution (`.java`), formatted with Prism.js syntax highlighting and 1-click "Copy Code" & "Word Wrap" buttons. Clicking an unsolved problem opens it directly on LeetCode.
- **💾 Offline Resilience & Speed**: Bundled with a fallback dataset and caching for instant loading and zero rate-limit issues.

## 🛠️ Local Development

Since this project dynamically interacts with APIs and bundled assets:

```bash
node server.js
# or
python3 -m http.server 8000
```
Then open `http://localhost:8000/` in your browser.

## 🌐 Deployment to GitHub Pages

1. Commit and push the files to your `leetcode-viewer` repository.
2. In your repository on GitHub, go to **Settings > Pages**.
3. Under **Build and deployment**, select **Deploy from a branch** (choose `main` branch and `/ (root)` folder).
4. Your dashboard is live at `https://rohitkr7.github.io/leetcode-viewer/`!
