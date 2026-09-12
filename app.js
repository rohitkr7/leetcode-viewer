// LeetCode DSA Solutions Viewer - Dynamic GitHub Explorer
function startApp() {
    // --- State ---
    let problems = [];
    let blind75 = [];
    let filteredProblems = [];
    let currentFilter = {
        search: '',
        difficulty: 'All',
        topic: 'All',
        sort: 'id-asc'
    };
    let uniqueTopics = new Set();
    const CACHE_KEY = 'lc_viewer_problems_cache_v6';
    const CACHE_TIME_KEY = 'lc_viewer_cache_timestamp_v6';
    const GITHUB_REPO = 'rohitkr7/leetcode-solutions';

    // --- DOM Elements ---
    const statsCards = document.getElementById('stats-cards');
    const statsTopicWidget = document.getElementById('stats-topic-widget');
    const problemsTbody = document.getElementById('problems-tbody');
    const resultsCount = document.getElementById('results-count');
    const searchInput = document.getElementById('search-input');
    const difficultyFilters = document.getElementById('difficulty-filters');
    const topicSelect = document.getElementById('topic-select');
    const sortSelect = document.getElementById('sort-select');
    const emptyState = document.getElementById('empty-state');
    const clearFiltersBtn = document.getElementById('clear-filters-btn');
    const syncBtn = document.getElementById('sync-btn');
    const syncText = document.getElementById('sync-text');
    const syncIcon = document.getElementById('sync-icon');

    // Table Header Sort Elements
    const thId = document.getElementById('th-id');
    const thTitle = document.getElementById('th-title');
    const thDiff = document.getElementById('th-diff');

    // Modal Elements
    const modal = document.getElementById('code-modal');
    const modalBackdrop = document.getElementById('modal-backdrop');
    const modalPanel = document.getElementById('modal-panel');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const modalId = document.getElementById('modal-id');
    const modalTitle = document.getElementById('modal-title');
    const modalDiff = document.getElementById('modal-difficulty');
    const modalDesc = document.getElementById('modal-description');
    const modalCode = document.getElementById('modal-code');
    const modalFileName = document.getElementById('modal-file-name');
    const modalTags = document.getElementById('modal-tags');
    const modalLeetcodeLink = document.getElementById('modal-leetcode-link');
    const modalGithubLink = document.getElementById('modal-github-link');
    const modalPre = document.getElementById('modal-pre');
    const wrapBtn = document.getElementById('wrap-code-btn');
    const wrapText = document.getElementById('wrap-text');
    const copyBtn = document.getElementById('copy-code-btn');
    const copyText = document.getElementById('copy-text');
    let isWordWrap = localStorage.getItem('lc_viewer_word_wrap') === 'true';
    let currentRawCode = '';

    // --- Topic Classification Rules for Newly Added Problems ---
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

    function renderCodeContent(rawCode) {
        currentRawCode = rawCode || '';
        try {
            const highlighted = Prism.highlight(currentRawCode, Prism.languages.java || Prism.languages.clike, 'java');
            const lines = highlighted.split('\n');
            let openTags = [];
            const formattedLines = lines.map((line, idx) => {
                let linePrefix = openTags.join('');
                const tagRegex = /<\/?([a-z0-9-]+)(?:\s+[^>]*)?>/gi;
                let match;
                while ((match = tagRegex.exec(line)) !== null) {
                    if (match[0].startsWith('</')) {
                        openTags.pop();
                    } else if (!match[0].endsWith('/>')) {
                        openTags.push(match[0]);
                    }
                }
                let lineSuffix = openTags.map(t => `</${t.match(/<([a-z0-9-]+)/i)[1]}>`).reverse().join('');
                return `<div class="code-line"><span class="code-line-num">${idx + 1}</span><span class="code-line-content">${linePrefix}${line || ' '}${lineSuffix}</span></div>`;
            });
            modalCode.innerHTML = formattedLines.join('');
        } catch (e) {
            modalCode.textContent = currentRawCode;
        }
    }

    function updateWordWrapUI() {
        if (modalPre) {
            modalPre.classList.toggle('code-wrapped', isWordWrap);
        }
        if (wrapBtn) {
            if (isWordWrap) {
                wrapBtn.classList.add('border-lc-gold/70', 'text-lc-gold', 'bg-amber-500/15');
                wrapBtn.classList.remove('text-slate-300', 'bg-slate-800');
                if (wrapText) wrapText.textContent = 'Wrapped';
                wrapBtn.setAttribute('title', 'Word Wrap: ON (Click to disable)');
            } else {
                wrapBtn.classList.remove('border-lc-gold/70', 'text-lc-gold', 'bg-amber-500/15');
                wrapBtn.classList.add('text-slate-300', 'bg-slate-800');
                if (wrapText) wrapText.textContent = 'Wrap';
                wrapBtn.setAttribute('title', 'Word Wrap: OFF (Click to enable)');
            }
        }
    }

    // --- Initialization & Data Fetching ---
    async function init() {
        setupEventListeners();

        // 1. Fetch blind75 list
        try {
            const b75Res = await fetch('blind75.json');
            if (b75Res.ok) {
                blind75 = await b75Res.json();
            }
        } catch (e) {}

        // 2. Always load baseline bundled problems.json first
        let loadedFromSeed = false;
        try {
            const res = await fetch('problems.json');
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data) && data.length > 0) {
                    setProblemsData(data);
                    loadedFromSeed = true;
                }
            }
        } catch (e) {
            console.warn('Local problems.json fetch fallback:', e);
        }

        // Fallback to cache if offline
        if (!loadedFromSeed) {
            try {
                const rawCache = localStorage.getItem(CACHE_KEY);
                if (rawCache) {
                    const cached = JSON.parse(rawCache);
                    if (Array.isArray(cached) && cached.length > 0) {
                        setProblemsData(cached);
                    }
                }
            } catch (e) {}
        }

        // 3. Synchronize dynamically with GitHub Git Trees API in background
        syncWithGitHub(false);
    }

    async function syncWithGitHub(manualTrigger = false) {
        if (manualTrigger) {
            syncIcon.classList.add('animate-spin');
            syncText.textContent = 'Syncing...';
        }

        try {
            const apiUrl = `https://api.github.com/repos/${GITHUB_REPO}/git/trees/main?recursive=1`;
            const response = await fetch(apiUrl);
            
            if (!response.ok) {
                throw new Error(`GitHub API error: ${response.status}`);
            }

            const data = await response.json();
            if (!data || !data.tree) throw new Error('Invalid tree format');

            // Parse problem folders
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

            // Existing problem map for preserving difficulty and topics if already known
            const existingMap = new Map(problems.map(p => [p.id, p]));
            const blindMap = new Map(blind75.map(p => [p.id, p]));

            const newProblemsList = [];
            for (const [folder, info] of folderMap.entries()) {
                const match = folder.match(/^(\d{4})-(.+)$/);
                if (!match) continue;
                const id = parseInt(match[1], 10);
                const slug = match[2];
                const title = slug.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
                
                const existing = existingMap.get(id);
                const isBlind = blindMap.has(id);
                const blindInfo = blindMap.get(id);

                newProblemsList.push({
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

            newProblemsList.sort((a, b) => a.id - b.id);

            // Update state & cache
            setProblemsData(newProblemsList);
            try {
                localStorage.setItem(CACHE_KEY, JSON.stringify(newProblemsList));
                localStorage.setItem(CACHE_TIME_KEY, new Date().toISOString());
            } catch (e) {}

            if (syncText) syncText.textContent = `Live Synced (${newProblemsList.length})`;
        } catch (error) {
            console.warn('GitHub Live Sync fallback:', error.message);
            if (syncText) syncText.textContent = `Offline (${problems.length || 0})`;
        } finally {
            if (manualTrigger) {
                setTimeout(() => {
                    syncIcon.classList.remove('animate-spin');
                }, 500);
            }
        }
    }

    function setProblemsData(data) {
        problems = data;
        
        // Collect unique topics
        uniqueTopics.clear();
        problems.forEach(p => {
            if (p.topics && Array.isArray(p.topics)) {
                p.topics.forEach(t => uniqueTopics.add(t));
            }
        });

        populateTopicDropdown();
        applyFilters();
    }

    function populateTopicDropdown() {
        const sortedTopics = Array.from(uniqueTopics).sort();
        const currentSelected = topicSelect.value;
        const solvedBlindCount = problems.filter(p => p.isBlind75).length;

        topicSelect.innerHTML = `
            <option value="All">All Topics & Patterns (${sortedTopics.length})</option>
            <option value="Blind 75">🎯 Blind 75 (${solvedBlindCount})</option>
        `;

        sortedTopics.forEach(t => {
            const count = problems.filter(p => p.topics && p.topics.includes(t)).length;
            const opt = document.createElement('option');
            opt.value = t;
            opt.textContent = `${t} (${count})`;
            topicSelect.appendChild(opt);
        });

        if (sortedTopics.includes(currentSelected) || currentSelected === 'Blind 75') {
            topicSelect.value = currentSelected;
        } else {
            topicSelect.value = 'All';
        }
    }

    // --- Filtering & Sorting ---
    function applyFilters() {
        filteredProblems = problems.filter(p => {
            // Search match
            const q = currentFilter.search.toLowerCase().trim();
            const searchMatch = !q || 
                p.title.toLowerCase().includes(q) ||
                p.id.toString().includes(q) ||
                p.slug.toLowerCase().includes(q) ||
                (p.topics && p.topics.some(t => t.toLowerCase().includes(q)));

            // Difficulty match
            const diffMatch = currentFilter.difficulty === 'All' || p.difficulty === currentFilter.difficulty;

            // Topic / Blind 75 match
            let topicMatch = true;
            if (currentFilter.topic === 'Blind 75') {
                topicMatch = Boolean(p.isBlind75);
            } else if (currentFilter.topic !== 'All') {
                topicMatch = Boolean(p.topics && p.topics.includes(currentFilter.topic));
            }

            return searchMatch && diffMatch && topicMatch;
        });

        // Sorting
        filteredProblems.sort((a, b) => {
            const diffMap = { 'Easy': 1, 'Medium': 2, 'Hard': 3 };
            switch (currentFilter.sort) {
                case 'id-asc': return a.id - b.id;
                case 'id-desc': return b.id - a.id;
                case 'diff-asc': return (diffMap[a.difficulty] || 2) - (diffMap[b.difficulty] || 2);
                case 'diff-desc': return (diffMap[b.difficulty] || 2) - (diffMap[a.difficulty] || 2);
                case 'title-asc': return a.title.localeCompare(b.title);
                default: return a.id - b.id;
            }
        });

        renderStats();
        renderTable();
    }

    // --- Rendering ---
    function renderStats() {
        const total = problems.length;
        const easy = problems.filter(p => p.difficulty === 'Easy').length;
        const medium = problems.filter(p => p.difficulty === 'Medium').length;
        const hard = problems.filter(p => p.difficulty === 'Hard').length;
        const solvedBlindCount = problems.filter(p => p.isBlind75).length;

        const easyPct = total > 0 ? Math.round((easy / total) * 100) : 0;
        const mediumPct = total > 0 ? Math.round((medium / total) * 100) : 0;
        const hardPct = total > 0 ? Math.round((hard / total) * 100) : 0;

        // Calculate top topics
        const topicCounts = {};
        problems.forEach(p => {
            if (p.topics) {
                p.topics.forEach(t => topicCounts[t] = (topicCounts[t] || 0) + 1);
            }
        });
        const topTopics = Object.entries(topicCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 7);

        if (statsCards) {
            statsCards.innerHTML = `
                <!-- Total Solved -->
                <div class="stat-card cursor-pointer bg-lc-card rounded-xl p-3.5 sm:p-4 border border-slate-800/90 shadow-lg flex flex-col justify-between hover:border-slate-600 hover:bg-slate-800/40 transition-all ${currentFilter.difficulty === 'All' && currentFilter.topic === 'All' ? 'ring-1 ring-slate-600' : ''}" data-diff="All" title="Click to view all problems">
                    <div class="flex items-center justify-between mb-1">
                        <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Solved</span>
                        <span class="p-1 rounded bg-slate-800 text-lc-cyan">
                            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                        </span>
                    </div>
                    <div class="my-1 flex items-baseline justify-between">
                        <span class="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight">${total}</span>
                        <span class="text-[10px] font-mono text-slate-400 font-semibold px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700">All</span>
                    </div>
                    <div class="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
                        <div class="bg-lc-cyan h-1.5 rounded-full" style="width: 100%"></div>
                    </div>
                </div>

                <!-- Easy -->
                <div class="stat-card cursor-pointer bg-lc-card rounded-xl p-3.5 sm:p-4 border border-slate-800/90 shadow-lg flex flex-col justify-between hover:border-emerald-500/40 hover:bg-slate-800/40 transition-all ${currentFilter.difficulty === 'Easy' ? 'ring-1 ring-emerald-500' : ''}" data-diff="Easy" title="Click to filter Easy problems">
                    <div class="mb-1">
                        <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Easy</span>
                    </div>
                    <div class="my-1 flex items-center justify-between gap-1">
                        <span class="text-2xl sm:text-3xl font-extrabold text-lc-easy font-mono tracking-tight">${easy}</span>
                        <span class="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 text-lc-easy border border-emerald-500/25 font-mono">${easyPct}%</span>
                    </div>
                    <div class="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
                        <div class="bg-lc-easy h-1.5 rounded-full transition-all duration-500" style="width: ${easyPct}%"></div>
                    </div>
                </div>

                <!-- Medium -->
                <div class="stat-card cursor-pointer bg-lc-card rounded-xl p-3.5 sm:p-4 border border-slate-800/90 shadow-lg flex flex-col justify-between hover:border-amber-500/40 hover:bg-slate-800/40 transition-all ${currentFilter.difficulty === 'Medium' ? 'ring-1 ring-amber-500' : ''}" data-diff="Medium" title="Click to filter Medium problems">
                    <div class="mb-1">
                        <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Medium</span>
                    </div>
                    <div class="my-1 flex items-center justify-between gap-1">
                        <span class="text-2xl sm:text-3xl font-extrabold text-lc-medium font-mono tracking-tight">${medium}</span>
                        <span class="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-500/10 text-lc-medium border border-amber-500/25 font-mono">${mediumPct}%</span>
                    </div>
                    <div class="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
                        <div class="bg-lc-medium h-1.5 rounded-full transition-all duration-500" style="width: ${mediumPct}%"></div>
                    </div>
                </div>

                <!-- Hard -->
                <div class="stat-card cursor-pointer bg-lc-card rounded-xl p-3.5 sm:p-4 border border-slate-800/90 shadow-lg flex flex-col justify-between hover:border-rose-500/40 hover:bg-slate-800/40 transition-all ${currentFilter.difficulty === 'Hard' ? 'ring-1 ring-rose-500' : ''}" data-diff="Hard" title="Click to filter Hard problems">
                    <div class="mb-1">
                        <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Hard</span>
                    </div>
                    <div class="my-1 flex items-center justify-between gap-1">
                        <span class="text-2xl sm:text-3xl font-extrabold text-lc-hard font-mono tracking-tight">${hard}</span>
                        <span class="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-rose-500/10 text-lc-hard border border-rose-500/25 font-mono">${hardPct}%</span>
                    </div>
                    <div class="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
                        <div class="bg-lc-hard h-1.5 rounded-full transition-all duration-500" style="width: ${hardPct}%"></div>
                    </div>
                </div>
            `;

            statsCards.querySelectorAll('.stat-card').forEach(card => {
                card.addEventListener('click', () => {
                    const diff = card.dataset.diff;
                    const tabBtn = difficultyFilters.querySelector(`button[data-diff="${diff}"]`);
                    if (tabBtn) tabBtn.click();
                });
            });
        }

        if (statsTopicWidget) {
            const isBlindSelected = currentFilter.topic === 'Blind 75';

            statsTopicWidget.innerHTML = `
                <div class="flex items-center justify-between mb-2.5">
                    <div class="flex items-center gap-2">
                        <span class="text-xs font-bold uppercase tracking-wider text-slate-300">Top Problem Categories</span>
                    </div>
                    <span class="text-[11px] text-slate-500 font-mono">Click to Filter</span>
                </div>
                <div class="flex flex-wrap gap-2" id="quick-topics-container">
                    <!-- Blind 75 Special Filter Chip -->
                    <button type="button" data-topic="Blind 75" class="quick-topic-chip inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${isBlindSelected ? 'border-amber-400 bg-amber-500/20 text-amber-300 ring-1 ring-amber-400/50' : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 hover:border-amber-400'}">
                        <span>🎯 Blind 75</span>
                        <span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-amber-300 font-mono font-bold">${solvedBlindCount}</span>
                    </button>

                    ${topTopics.map(([name, count]) => `
                        <button type="button" data-topic="${name}" class="quick-topic-chip inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 hover:border-slate-600 transition-all ${currentFilter.topic === name ? 'border-lc-cyan bg-lc-cyan/15 text-lc-cyan ring-1 ring-lc-cyan/40' : ''}">
                            <span>${name}</span>
                            <span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 font-mono font-bold">${count}</span>
                        </button>
                    `).join('')}
                </div>
            `;

            // Add click listeners to quick topic chips
            statsTopicWidget.querySelectorAll('.quick-topic-chip').forEach(chip => {
                chip.addEventListener('click', () => {
                    const topic = chip.dataset.topic;
                    topicSelect.value = currentFilter.topic === topic ? 'All' : topic;
                    currentFilter.topic = topicSelect.value;
                    applyFilters();
                });
            });
        }
    }

    function getDifficultyBadge(diff) {
        if (diff === 'Easy') return '<span class="inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold bg-emerald-500/10 text-lc-easy border border-emerald-500/30">Easy</span>';
        if (diff === 'Medium') return '<span class="inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold bg-amber-500/10 text-lc-medium border border-amber-500/30">Medium</span>';
        return '<span class="inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold bg-rose-500/10 text-lc-hard border border-rose-500/30">Hard</span>';
    }

    function renderTable() {
        if (filteredProblems.length === 0) {
            problemsTbody.innerHTML = '';
            emptyState.classList.remove('hidden');
            resultsCount.textContent = `Showing 0 of ${problems.length} problems`;
            return;
        }

        emptyState.classList.add('hidden');
        resultsCount.textContent = `Showing ${filteredProblems.length} of ${problems.length} problems ${currentFilter.topic === 'Blind 75' ? '(Blind 75 Filtered)' : ''}`;

        problemsTbody.innerHTML = filteredProblems.map(p => {
            const blindBadge = p.isBlind75 
                ? `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0">🎯 Blind 75</span>` 
                : '';

            const topicsHtml = (p.topics || []).slice(0, 3).map(t => 
                `<span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800/90 text-slate-300 border border-slate-700/60">${t}</span>`
            ).join(' ') + ((p.topics && p.topics.length > 3) ? ` <span class="text-[11px] text-slate-500">+${p.topics.length - 3}</span>` : '');

            return `
                <tr class="problem-row cursor-pointer transition-colors group hover:bg-slate-800/60" data-id="${p.id}">
                    <td class="py-3 px-2.5 sm:px-4 text-center font-mono text-xs font-semibold text-slate-400 group-hover:text-white">
                        #${p.id}
                    </td>
                    <td class="py-3 px-2 sm:px-4 min-w-0">
                        <div class="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                            <span class="font-semibold text-slate-100 group-hover:text-lc-cyan transition-colors text-xs sm:text-sm break-words">${p.title}</span>
                            ${blindBadge}
                            <a href="${p.leetcodeUrl}" target="_blank" onclick="event.stopPropagation()" title="Open on LeetCode" class="shrink-0 text-slate-500 hover:text-lc-gold transition-colors opacity-70 sm:opacity-0 sm:group-hover:opacity-100">
                                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                            </a>
                        </div>
                    </td>
                    <td class="py-3 px-2 sm:px-4 text-center sm:text-left whitespace-nowrap">
                        ${getDifficultyBadge(p.difficulty)}
                    </td>
                    <td class="py-3.5 px-4 hidden md:table-cell">
                        <div class="flex flex-wrap gap-1 items-center">
                            ${topicsHtml}
                        </div>
                    </td>
                    <td class="py-3.5 px-4 text-right whitespace-nowrap hidden sm:table-cell">
                        <button type="button" class="view-btn px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 group-hover:border-slate-600 transition-all inline-flex items-center gap-1.5">
                            <span>Solution</span>
                            <svg class="w-3 h-3 text-slate-400 group-hover:text-lc-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        // Bind row click handlers
        document.querySelectorAll('.problem-row').forEach(row => {
            row.addEventListener('click', () => {
                const id = parseInt(row.dataset.id, 10);
                openModal(id);
            });
        });
    }

    // --- Modal Logic with Dynamic Lazy Fetching ---
    async function openModal(id) {
        const problem = problems.find(p => p.id === id);
        if (!problem) return;

        modalId.textContent = `#${problem.id}`;
        modalTitle.textContent = problem.title;
        modalDiff.innerHTML = getDifficultyBadge(problem.difficulty);
        modalFileName.textContent = problem.javaFile ? problem.javaFile.split('/').pop() : 'Solution.java';
        modalLeetcodeLink.href = problem.leetcodeUrl;
        modalGithubLink.href = `https://github.com/${GITHUB_REPO}/tree/main/${problem.folder}`;

        // Tags in modal footer
        let tagsHtml = '';
        if (problem.isBlind75) {
            tagsHtml += `<span class="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[11px] text-amber-300 font-semibold">🎯 Blind 75</span>`;
        }
        if (problem.topics && problem.topics.length > 0) {
            tagsHtml += problem.topics.map(t => `<span class="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[11px] text-slate-300 font-medium">${t}</span>`).join('');
        }
        modalTags.innerHTML = tagsHtml;

        // Show loading state for code and description
        renderCodeContent('// Fetching solution from GitHub repository...');
        modalDesc.innerHTML = `<div class="animate-pulse text-xs text-slate-400 py-2">Loading problem description from repository...</div>`;

        // Reset copy button
        copyText.textContent = 'Copy Code';

        // Open modal
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        updateWordWrapUI();

        // 1. Fetch Java Code dynamically from raw GitHub
        const rawCodeUrl = `https://raw.githubusercontent.com/${GITHUB_REPO}/main/${problem.javaFile || problem.folder + '/' + problem.folder + '.java'}`;
        try {
            const codeRes = await fetch(rawCodeUrl);
            if (codeRes.ok) {
                const code = await codeRes.text();
                renderCodeContent(code);
            } else {
                renderCodeContent(`// Solution file available on GitHub:\n// https://github.com/${GITHUB_REPO}/tree/main/${problem.folder}`);
            }
        } catch (e) {
            renderCodeContent(`// Could not load raw file directly. View on GitHub:\n// https://github.com/${GITHUB_REPO}/tree/main/${problem.folder}`);
        }

        // 2. Fetch Description from README.md
        const rawReadmeUrl = `https://raw.githubusercontent.com/${GITHUB_REPO}/main/${problem.readmeFile || problem.folder + '/README.md'}`;
        try {
            const readmeRes = await fetch(rawReadmeUrl);
            if (readmeRes.ok) {
                const html = await readmeRes.text();
                const cleanHtml = html
                    .replace(/<h2>.*?<\/h2>/i, '')
                    .replace(/<h3>.*?<\/h3>/i, '')
                    .replace(/<hr\s*\/?>/gi, '');
                
                modalDesc.innerHTML = cleanHtml || '<p class="text-xs text-slate-400">No additional description provided in README.</p>';
            } else {
                modalDesc.innerHTML = `<p class="text-xs text-slate-400">Problem statement available directly on <a href="${problem.leetcodeUrl}" target="_blank" class="text-lc-gold underline">LeetCode</a>.</p>`;
            }
        } catch (e) {
            modalDesc.innerHTML = `<p class="text-xs text-slate-400">Problem statement available on <a href="${problem.leetcodeUrl}" target="_blank" class="text-lc-gold underline">LeetCode</a>.</p>`;
        }
    }

    function closeModal() {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }

    // --- Event Listeners Setup ---
    function setupEventListeners() {
        // Search Input
        searchInput.addEventListener('input', (e) => {
            currentFilter.search = e.target.value;
            applyFilters();
        });

        // Difficulty Tab Filter
        difficultyFilters.addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;
            
            difficultyFilters.querySelectorAll('button').forEach(b => {
                b.classList.remove('tab-active');
                b.classList.add('text-slate-400');
            });
            
            btn.classList.add('tab-active');
            btn.classList.remove('text-slate-400');

            currentFilter.difficulty = btn.dataset.diff;
            applyFilters();
        });

        // Topic Dropdown
        topicSelect.addEventListener('change', (e) => {
            currentFilter.topic = e.target.value;
            applyFilters();
        });

        // Sort Dropdown
        sortSelect.addEventListener('change', (e) => {
            currentFilter.sort = e.target.value;
            applyFilters();
        });

        // Table Header Sorters
        thId.addEventListener('click', () => {
            currentFilter.sort = currentFilter.sort === 'id-asc' ? 'id-desc' : 'id-asc';
            sortSelect.value = currentFilter.sort;
            applyFilters();
        });

        thTitle.addEventListener('click', () => {
            currentFilter.sort = currentFilter.sort === 'title-asc' ? 'id-asc' : 'title-asc';
            sortSelect.value = currentFilter.sort;
            applyFilters();
        });

        thDiff.addEventListener('click', () => {
            currentFilter.sort = currentFilter.sort === 'diff-asc' ? 'diff-desc' : 'diff-asc';
            sortSelect.value = currentFilter.sort;
            applyFilters();
        });

        // Reset Filters Button
        clearFiltersBtn.addEventListener('click', () => {
            searchInput.value = '';
            currentFilter.search = '';
            
            const allDiffBtn = difficultyFilters.querySelector('[data-diff="All"]');
            if (allDiffBtn) allDiffBtn.click();
            
            topicSelect.value = 'All';
            currentFilter.topic = 'All';
            
            sortSelect.value = 'id-asc';
            currentFilter.sort = 'id-asc';
            
            applyFilters();
        });

        // Mobile Hamburger Menu Toggle
        const hamburgerBtn = document.getElementById('hamburger-btn');
        const hamburgerIconOpen = document.getElementById('hamburger-icon-open');
        const hamburgerIconClose = document.getElementById('hamburger-icon-close');
        const mobileMenu = document.getElementById('mobile-menu');
        const mobileSyncBtn = document.getElementById('mobile-sync-btn');
        const mobileSyncText = document.getElementById('mobile-sync-text');

        if (hamburgerBtn && mobileMenu) {
            hamburgerBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isOpen = !mobileMenu.classList.contains('hidden');
                if (isOpen) {
                    mobileMenu.classList.add('hidden');
                    if (hamburgerIconOpen) hamburgerIconOpen.classList.remove('hidden');
                    if (hamburgerIconClose) hamburgerIconClose.classList.add('hidden');
                } else {
                    mobileMenu.classList.remove('hidden');
                    if (hamburgerIconOpen) hamburgerIconOpen.classList.add('hidden');
                    if (hamburgerIconClose) hamburgerIconClose.classList.remove('hidden');
                }
            });

            // Close mobile menu on outside click
            document.addEventListener('click', (e) => {
                if (!mobileMenu.contains(e.target) && !hamburgerBtn.contains(e.target) && !mobileMenu.classList.contains('hidden')) {
                    mobileMenu.classList.add('hidden');
                    if (hamburgerIconOpen) hamburgerIconOpen.classList.remove('hidden');
                    if (hamburgerIconClose) hamburgerIconClose.classList.add('hidden');
                }
            });

            // Close on link click
            mobileMenu.querySelectorAll('a').forEach(link => {
                link.addEventListener('click', () => {
                    mobileMenu.classList.add('hidden');
                    if (hamburgerIconOpen) hamburgerIconOpen.classList.remove('hidden');
                    if (hamburgerIconClose) hamburgerIconClose.classList.add('hidden');
                });
            });
        }

        if (mobileSyncBtn) {
            mobileSyncBtn.addEventListener('click', () => {
                syncWithGitHub(true);
            });
        }

        // Sync Button (Manual Refresh from GitHub)
        if (syncBtn) {
            syncBtn.addEventListener('click', () => {
                syncWithGitHub(true);
            });
        }

        // Modal Close Events
        modalCloseBtn.addEventListener('click', closeModal);
        modalBackdrop.addEventListener('click', closeModal);
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (!modal.classList.contains('hidden')) {
                    closeModal();
                }
                if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
                    mobileMenu.classList.add('hidden');
                    if (hamburgerIconOpen) hamburgerIconOpen.classList.remove('hidden');
                    if (hamburgerIconClose) hamburgerIconClose.classList.add('hidden');
                }
            }
        });

        // Copy Code Button
        copyBtn.addEventListener('click', () => {
            const code = currentRawCode || modalCode.textContent;
            navigator.clipboard.writeText(code).then(() => {
                copyText.textContent = 'Copied!';
                setTimeout(() => {
                    copyText.textContent = 'Copy Code';
                }, 2000);
            }).catch(err => {
                console.error('Failed to copy!', err);
            });
        });

        // Word Wrap Toggle Button
        if (wrapBtn) {
            wrapBtn.addEventListener('click', () => {
                isWordWrap = !isWordWrap;
                try {
                    localStorage.setItem('lc_viewer_word_wrap', isWordWrap);
                } catch (e) {}
                updateWordWrapUI();
            });
        }
    }

    // Start App
    updateWordWrapUI();
    init();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startApp);
} else {
    startApp();
}
