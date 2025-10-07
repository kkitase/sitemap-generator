const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());

app.get('/proxy', async (req, res) => {
    const targetUrl = req.query.url;

    if (!targetUrl) {
        return res.status(400).send('Error: URL parameter is required.');
    }

    let browser;
    try {
        // Puppeteerでブラウザを起動
        browser = await puppeteer.launch({
            // ヘッドレスモードで実行
            headless: true,
            // セキュリティサンドボックスを無効化（環境によっては必要）
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();

        // タイムアウトを60秒に設定
        await page.setDefaultNavigationTimeout(60000);

        // User-Agentを設定
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36');

        // ページに移動
        await page.goto(targetUrl, {
            // ネットワークがアイドル状態になるまで待機
            waitUntil: 'networkidle2',
        });

        // ページのHTMLコンテンツを取得
        const content = await page.content();
        
        // 取得したHTMLをクライアントに送信
        res.send(content);

    } catch (error) {
        console.error(`Error fetching the URL with Puppeteer: ${targetUrl}`, error.message);
        res.status(500).send(`Error fetching the URL: ${error.message}`);
    } finally {
        // ブラウザを閉じる
        if (browser) {
            await browser.close();
        }
    }
});

app.listen(PORT, () => {
    console.log(`✅ Proxy server with Puppeteer is running on http://localhost:${PORT}`);
});
