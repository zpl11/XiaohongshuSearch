(function () {
    // 数据存储
    const collectedComments = new Map();
    let observer = null;
    let debounceTimer = null;

    // --- 1. 核心抓取逻辑 (不变) ---
    function extractComments() {
        // 查找所有评论节点
        const elements = document.querySelectorAll('.comment-item');
        let newCount = 0;

        elements.forEach(el => {
            const id = el.id;
            if (!id || collectedComments.has(id)) return;

            const authorEl = el.querySelector('.name');
            const contentEl = el.querySelector('.note-text');
            const dateEl = el.querySelector('.date');
            const likeEl = el.querySelector('.like .count');

            const isSub = el.classList.contains('comment-item-sub') ? '回复' : '主评';

            const data = {
                id: id,
                type: isSub,
                author: authorEl ? authorEl.innerText.replace(/[\r\n,]/g, ' ') : '未知',
                content: contentEl ? contentEl.innerText.replace(/[\r\n]/g, ' ').replace(/,/g, '，') : '',
                dateLocation: dateEl ? dateEl.innerText.replace(/[\r\n,]/g, ' ') : '',
                likes: likeEl ? likeEl.innerText.trim() : '0'
            };

            collectedComments.set(id, data);
            newCount++;
        });

        // 只有当真的有新数据时才更新 UI，避免频繁闪烁
        if (newCount > 0) {
            updateStatus();
        }
        return newCount;
    }

    // --- 2. 智能监听逻辑 (MutationObserver) ---
    function startObserver() {
        if (observer) return; // 避免重复启动

        // 创建观察者：只要 DOM 结构发生变化（比如新评论加载出来了），就触发回调
        observer = new MutationObserver((mutations) => {
            // 防抖处理：变化可能瞬间发生几十次，我们等 500ms 平静下来后再抓取
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                extractComments();
            }, 500);
        });

        // 开始观察整个文档主体，确保不错过任何角落的变化
        observer.observe(document.body, {
            childList: true, // 监听子节点增加/删除
            subtree: true    // 监听所有后代节点（无论藏多深）
        });

        updateStatus('智能监听中... 请滚动查看评论');

        // 立即抓取一次当前屏幕内容
        extractComments();
    }

    function stopObserver() {
        if (observer) {
            observer.disconnect();
            observer = null;
        }
        updateStatus('监听已暂停');
    }

    // --- 3. UI 更新辅助 ---
    function updateStatus(msg) {
        const statusEl = document.getElementById('xhs-scraper-status');
        const btn = document.getElementById('xhs-scraper-btn');
        if (!statusEl || !btn) return;

        if (msg) {
            statusEl.innerText = msg;
        } else {
            statusEl.innerText = `已抓取: ${collectedComments.size} 条 (检测到新内容)`;
        }

        // 更新按钮状态
        if (observer) {
            btn.innerText = '停止监听';
            btn.style.backgroundColor = '#f44336'; // 红
        } else {
            btn.innerText = '开启智能监听';
            btn.style.backgroundColor = '#4CAF50'; // 绿
        }
    }

    // --- 4. 导出 CSV ---
    function downloadCSV() {
        if (collectedComments.size === 0) {
            alert('还没有抓取到数据。');
            return;
        }
        let csvContent = "\uFEFF评论ID,类型,用户名,评论内容,时间地点,点赞数\n";
        collectedComments.forEach(item => {
            csvContent += `${item.id},${item.type},"${item.author}","${item.content}","${item.dateLocation}","${item.likes}"\n`;
        });
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `小红书评论_${new Date().toISOString().slice(0, 19).replace(/T|:/g, "-")}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // --- 5. 清空数据 ---
    function clearData() {
        if (confirm(`确定清空当前 ${collectedComments.size} 条数据吗？`)) {
            collectedComments.clear();
            updateStatus('数据已清空。正在等待新内容...');
            // 清空后如果正在监听，立即扫描一次，防止清空瞬间当前屏幕就有数据
            if (observer) extractComments();
        }
    }

    // --- 6. 创建界面 ---
    function createUI() {
        if (document.getElementById('xhs-scraper-panel')) return;

        const panel = document.createElement('div');
        panel.id = 'xhs-scraper-panel';
        panel.style.cssText = `position:fixed; top:20px; right:20px; z-index:999999; background:white; padding:15px; border-radius:8px; box-shadow:0 4px 15px rgba(0,0,0,0.2); width:240px; font-family:sans-serif; border:1px solid #eee;`;

        panel.innerHTML = `
            <h3 style="margin:0 0 10px; font-size:16px; color:#333;">小红书评论抓取 (智能版)</h3>
            <div id="xhs-scraper-status" style="font-size:13px; color:#666; margin-bottom:12px;">准备就绪</div>
            <div style="display:flex; flex-direction:column; gap:8px;">
                <button id="xhs-scraper-btn" style="padding:8px; border:none; border-radius:4px; color:white; font-weight:bold; cursor:pointer;">开启智能监听</button>
                <button id="xhs-download-btn" style="padding:8px; background:#2196F3; border:none; border-radius:4px; color:white; font-weight:bold; cursor:pointer;">导出 CSV</button>
                <button id="xhs-clear-btn" style="padding:8px; background:#FF9800; border:none; border-radius:4px; color:white; font-weight:bold; cursor:pointer;">清空数据 (换帖用)</button>
                <button id="xhs-close-btn" style="padding:5px; background:transparent; border:1px solid #ccc; border-radius:4px; color:#999; cursor:pointer; font-size:12px; margin-top:5px;">关闭面板</button>
            </div>
        `;

        document.body.appendChild(panel);

        // 绑定事件
        document.getElementById('xhs-scraper-btn').onclick = () => observer ? stopObserver() : startObserver();
        document.getElementById('xhs-download-btn').onclick = downloadCSV;
        document.getElementById('xhs-clear-btn').onclick = clearData;
        document.getElementById('xhs-close-btn').onclick = () => { stopObserver(); panel.remove(); };

        // 初始化状态
        stopObserver();
    }

    createUI();
})();