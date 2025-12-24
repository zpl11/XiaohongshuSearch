(function () {
    const dataMap = new Map();

    // 1. 创建 UI 按钮
    const btn = document.createElement('button');
    btn.innerHTML = '导出 CSV (0)';
    btn.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:9999;padding:12px 24px;background:#ff2442;color:white;border:none;border-radius:30px;cursor:pointer;box-shadow:0 4px 15px rgba(0,0,0,0.3);font-weight:bold;font-size:14px;';
    document.body.appendChild(btn);

    // 2. 提取逻辑
    const extractItems = () => {
        const items = document.querySelectorAll('section.note-item');
        items.forEach(item => {
            const linkWrap = item.querySelector('a.cover');
            if (!linkWrap) return;
            const href = linkWrap.getAttribute('href') || '';
            const id = href.split('?')[0].split('/').pop();

            if (id && !dataMap.has(id)) {
                const title = item.querySelector('.title span')?.innerText.replace(/[\r\n,]/g, ' ') || ''; // 移除换行和逗号防止CSV错位
                const author = item.querySelector('.name')?.innerText.replace(/[\r\n,]/g, ' ') || '';
                const likes = item.querySelector('.count')?.innerText.trim() || '0';

                dataMap.set(id, {
                    id: id,
                    title: title,
                    author: author,
                    likes: likes,
                    url: `https://www.xiaohongshu.com/explore/${id}`
                });
                btn.innerHTML = `导出 CSV (${dataMap.size})`;
            }
        });
    };

    // 3. CSV 转换与下载逻辑
    const downloadCSV = () => {
        if (dataMap.size === 0) return alert('请先滚动页面捕获数据');

        const headers = ['笔记ID', '标题', '作者', '点赞数', '详情链接'];
        const rows = Array.from(dataMap.values()).map(item =>
            [item.id, item.title, item.author, item.likes, item.url].join(',')
        );

        // 加上 BOM 头防止 Excel 打开中文乱码
        const csvContent = '\uFEFF' + headers.join(',') + '\n' + rows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `小红书采集_${new Date().getTime()}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // 4. 监听 DOM 变化
    const observer = new MutationObserver(extractItems);
    observer.observe(document.body, { childList: true, subtree: true });

    // 5. 初始执行与点击绑定
    extractItems();
    btn.onclick = downloadCSV;

    console.log("%cCSV 提取脚本已就绪！请手动滚动页面，点击右下角按钮下载。", "color: #ff2442; font-weight: bold;");
})();