document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('sitemap-form');
    const urlInput = document.getElementById('url-input');
    const startButton = document.getElementById('start-button');
    const stopButton = document.getElementById('stop-button');
    const loadingDiv = document.getElementById('loading');
    const errorDiv = document.getElementById('error');
    const sitemapContainer = document.getElementById('sitemap-container');
    const downloadButton = document.getElementById('download-button');

    let isCrawling = false;
    let currentSitemap = new Map();

    // メインの処理
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const startUrl = urlInput.value.trim();
        if (!startUrl) return;

        // UIを初期化
        resetUI();
        isCrawling = true;
        startButton.disabled = true;
        stopButton.style.display = 'block';
        loadingDiv.style.display = 'block';

        try {
            currentSitemap = await crawlWebsite(startUrl);
            displaySitemap(currentSitemap); // 常に結果を表示

            if (!isCrawling) { // 停止された場合のメッセージを追加
                const stopMessage = document.createElement('p');
                stopMessage.textContent = '生成が停止されました。';
                sitemapContainer.prepend(stopMessage);
            }
        } catch (error) {
            showError(error.message);
        } finally {
            isCrawling = false;
            loadingDiv.style.display = 'none';
            startButton.disabled = false;
            stopButton.style.display = 'none';
        }
    });

    // 停止ボタンの処理
    stopButton.addEventListener('click', () => {
        isCrawling = false;
    });

    // ダウンロードボタンの処理
    downloadButton.addEventListener('click', () => {
        if (currentSitemap.size === 0) return;

        const urls = [...currentSitemap.keys()];
        const textContent = urls.join('\n');
        const blob = new Blob([textContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'sitemap.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    // ウェブサイトをクロールする非同期関数
    async function crawlWebsite(startUrl) {
        const crawled = new Set();
        const queue = [startUrl];
        const sitemap = new Map();
        let domain;

        try {
            const urlObj = new URL(startUrl);
            domain = urlObj.hostname;
        } catch (e) {
            throw new Error('無効なURLです。');
        }
        
        while (queue.length > 0 && isCrawling) {
            const currentUrl = queue.shift();

            if (crawled.has(currentUrl)) {
                continue;
            }

            crawled.add(currentUrl);

            try {
                const proxyUrl = `http://localhost:3000/proxy?url=${encodeURIComponent(currentUrl)}`;
                const response = await fetch(proxyUrl);
                
                if (!response.ok) {
                    const errorText = await response.text();
                    console.warn(`フェッチ失敗: ${currentUrl} (Status: ${response.status})`, errorText);
                    sitemap.set(currentUrl, `エラー (Status: ${response.status})`);
                    continue;
                }

                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('text/html')) {
                    console.warn(`HTMLでないためスキップ: ${currentUrl}`);
                    continue;
                }
                
                const html = await response.text();
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');

                const title = doc.querySelector('title')?.textContent.trim() || 'タイトルなし';
                sitemap.set(currentUrl, title);

                updateIntermediateDisplay(sitemap);

                doc.querySelectorAll('a').forEach(link => {
                    const href = link.getAttribute('href');
                    if (!href || href.startsWith('mailto:') || href.startsWith('tel:')) return;

                    try {
                        const absoluteUrl = new URL(href, currentUrl).href;
                        const normalizedUrl = absoluteUrl.split('#')[0];

                        if (new URL(normalizedUrl).hostname === domain && !crawled.has(normalizedUrl)) {
                            queue.push(normalizedUrl);
                        }
                    } catch (e) {
                        // 無効なURLは無視
                    }
                });

            } catch (error) {
                console.error(`クロールエラー (${currentUrl}):`, error);
                 throw new Error(
                    'プロキシサーバーへの接続に失敗しました。サーバーが http://localhost:3000 で起動していることを確認してください。'
                );
            }
        }
        return sitemap;
    }
    
    // 結果を表示する関数
    function displaySitemap(sitemap) {
        if (sitemap.size === 0) {
            sitemapContainer.innerHTML = '<p>ページが見つかりませんでした。</p>';
            downloadButton.style.display = 'none';
            return;
        }
        let html = `<h3>${sitemap.size}ページが見つかりました</h3><ul class="sitemap-list">`;
        for (const [url, title] of sitemap.entries()) {
            html += `<li>
                        <strong>${escapeHtml(title)}</strong>
                        <a href="${url}" target="_blank">${escapeHtml(url)}</a>
                     </li>`;
        }
        html += '</ul>';
        sitemapContainer.innerHTML = html;
        downloadButton.style.display = 'block';
    }

    // クロール中に中間結果を表示する関数
    function updateIntermediateDisplay(sitemap) {
        currentSitemap = sitemap;
        displaySitemap(sitemap);
    }

    // UIをリセットする関数
    function resetUI() {
        sitemapContainer.innerHTML = '';
        errorDiv.style.display = 'none';
        errorDiv.textContent = '';
        downloadButton.style.display = 'none';
        currentSitemap.clear();
    }

    // エラーメッセージを表示する関数
    function showError(message) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }

    // XSS対策のためのHTMLエスケープ関数
    function escapeHtml(str) {
        const div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }
});
