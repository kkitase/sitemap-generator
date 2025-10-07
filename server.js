const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = 3000; // サーバーを起動するポート番号

// CORSミドルウェアを使用して、すべてのオリジンからのリクエストを許可
app.use(cors());

// '/proxy' というエンドポイント（APIの窓口）を作成
app.get('/proxy', async (req, res) => {
    // クエリパラメータから 'url' を取得 (例: /proxy?url=https://example.com)
    const targetUrl = req.query.url;

    if (!targetUrl) {
        return res.status(400).send('Error: URL parameter is required.');
    }

    try {
        // Axiosを使って対象のURLからHTMLコンテンツを取得
        const response = await axios.get(targetUrl, {
            headers: {
                // 'User-Agent' を設定しないと、ボットと判定されてブロックされるサイトがあるため設定を推奨
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        
        // 取得したHTMLをクライアント（サイトマップジェネレータ）に送信
        res.send(response.data);

    } catch (error) {
        console.error('Error fetching the URL:', error.message);
        // エラーが発生した場合は、クライアントにもエラー情報を返す
        res.status(500).send(`Error fetching the URL: ${error.message}`);
    }
});

// 指定したポートでサーバーを起動
app.listen(PORT, () => {
    console.log(`✅ Proxy server is running on http://localhost:${PORT}`);
});
