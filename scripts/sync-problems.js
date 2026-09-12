const fs = require('fs');
const path = require('path');

const GITHUB_REPO = 'rohitkr7/leetcode-solutions';
const PROBLEMS_FILE = path.join(__dirname, '..', 'problems.json');
const BLIND75_FILE = path.join(__dirname, '..', 'blind75.json');

const topicRules = [
    { topic: 'Linked List', regex: /linked-list|node|merge-two-sorted-lists|add-two-numbers|swap-nodes|reverse-linked/i },
    { topic: 'Tree / BST', regex: /tree|bst|binary-tree|level-order|traversal|lca|lowest-common-ancestor|inorder|preorder|postorder/i },
    { topic: 'Graph / DFS / BFS', regex: /graph|island|course-schedule|clone-graph|surrounded|pacific-atlantic|word-search|n-queens/i },
    { topic: 'Dynamic Programming', regex: /dynamic-programming|climbing-stairs|house-robber|coin-change|longest-increasing|longest-common|word-break|edit-distance|minimum-path-sum/i },
    { topic: 'Two Pointers', regex: /two-pointers|two-sum|3sum|container-with-most-water|trapping-rain-water|valid-palindrome|remove-duplicates|sort-colors/i },
    { topic: 'Sliding Window', regex: /sliding-window|longest-substring|minimum-window|permutation-in-string|maximum-average/i },
    { topic: 'Stack', regex: /stack|valid-parentheses|daily-temperatures|min-stack|evaluate-reverse-polish|generate-parentheses/i },
    { topic: 'Binary Search', regex: /binary-search|search-in-rotated|find-minimum|search-a-2d-matrix|koko|median-of-two/i },
    { topic: 'Array & Matrix', regex: /array|matrix|rotate-image|spiral-matrix|set-matrix|product-of-array|contains-duplicate|majority-element|maximum-subarray|pascals-triangle/i },
    { topic: 'String', regex: /string|anagram|palindrome|parentheses|roman|integer-to-roman|longest-common-prefix/i },
    { topic: 'Backtracking', regex: /backtracking|subsets|permutations|combination-sum|n-queens|generate-parentheses/i }
];

function inferTopics(slug) {
    const matched = [];
    const lower = slug.toLowerCase();
    for (const rule of topicRules) {
        if (rule.regex.test(lower)) {
            matched.push(rule.topic);
        }
    }
    return matched.length > 0 ? matched : ['Algorithms'];
}

async function sync() {
    console.log(`Fetching repository tree from ${GITHUB_REPO}...`);
    const headers = {
        'User-Agent': 'LeetCode-Viewer-Sync-Action'
    };
    if (process.env.GITHUB_TOKEN) {
        headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
    }

    const apiUrl = `https://api.github.com/repos/${GITHUB_REPO}/git/trees/main?recursive=1`;
    const res = await fetch(apiUrl, { headers });

    if (!res.ok) {
        throw new Error(`Failed to fetch GitHub Tree API: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    if (!data || !data.tree) {
        throw new Error('Invalid response structure from GitHub Trees API');
    }

    // Load existing problems.json to preserve curated metadata
    let existingProblems = [];
    if (fs.existsSync(PROBLEMS_FILE)) {
        try {
            existingProblems = JSON.parse(fs.readFileSync(PROBLEMS_FILE, 'utf8'));
        } catch (e) {
            console.warn('Could not parse existing problems.json, creating anew:', e.message);
        }
    }
    const existingMap = new Map(existingProblems.map(p => [p.id, p]));

    // Load blind75.json
    let blind75List = [];
    if (fs.existsSync(BLIND75_FILE)) {
        try {
            blind75List = JSON.parse(fs.readFileSync(BLIND75_FILE, 'utf8'));
        } catch (e) {
            console.warn('Could not parse existing blind75.json:', e.message);
        }
    }
    const blind75Map = new Map(blind75List.map(p => [p.id, p]));

    // Parse folder structure from GitHub Tree
    const folderMap = new Map();
    data.tree.forEach(item => {
        const parts = item.path.split('/');
        if (parts.length > 1 && /^\d{4}-/.test(parts[0])) {
            const folder = parts[0];
            if (!folderMap.has(folder)) {
                folderMap.set(folder, { folder, javaFile: null, readmeFile: null });
            }
            if (item.path.endsWith('.java')) {
                folderMap.get(folder).javaFile = item.path;
            }
            if (item.path.endsWith('README.md')) {
                folderMap.get(folder).readmeFile = item.path;
            }
        }
    });

    const updatedList = [];
    const solvedIds = new Set();

    for (const [folder, info] of folderMap.entries()) {
        const match = folder.match(/^(\d{4})-(.+)$/);
        if (!match) continue;
        const id = parseInt(match[1], 10);
        solvedIds.add(id);
        const slug = match[2];
        const title = slug.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');

        const existing = existingMap.get(id);
        const isBlind = blind75Map.has(id);
        const blindInfo = blind75Map.get(id);

        updatedList.push({
            id,
            title: existing?.title || blindInfo?.title || title,
            slug,
            folder,
            leetcodeUrl: `https://leetcode.com/problems/${slug}/`,
            javaFile: info.javaFile || `${folder}/${folder}.java`,
            readmeFile: info.readmeFile || `${folder}/README.md`,
            difficulty: existing?.difficulty || blindInfo?.difficulty || 'Medium',
            topics: existing?.topics && existing.topics.length > 0 ? existing.topics : inferTopics(slug),
            isBlind75: isBlind
        });
    }

    updatedList.sort((a, b) => a.id - b.id);

    // Update blind75.json solved status
    const updatedBlind75 = blind75List.map(item => {
        const isSolved = solvedIds.has(item.id);
        const solvedItem = updatedList.find(p => p.id === item.id);
        return {
            ...item,
            isSolved,
            folder: isSolved ? solvedItem?.folder : undefined,
            javaFile: isSolved ? solvedItem?.javaFile : undefined,
            readmeFile: isSolved ? solvedItem?.readmeFile : undefined
        };
    });

    fs.writeFileSync(PROBLEMS_FILE, JSON.stringify(updatedList, null, 2), 'utf8');
    fs.writeFileSync(BLIND75_FILE, JSON.stringify(updatedBlind75, null, 2), 'utf8');
    
    const solvedBlindCount = updatedBlind75.filter(p => p.isSolved).length;
    console.log(`Successfully synced ${updatedList.length} problems to problems.json.`);
    console.log(`Blind 75 status: ${solvedBlindCount} / ${updatedBlind75.length} solved.`);
}

sync().catch(err => {
    console.error('Sync failed:', err);
    process.exit(1);
});
