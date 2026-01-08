require('dotenv').config(); // 載入環境變數
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// 1. 初始化 Supabase 客戶端
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// 2. 中間件設定
app.use(cors()); // 允許前端跨網域存取
app.use(express.json()); // 讓後端讀懂前端傳來的 JSON 資料

// 3. 路由設定 (Routes)

// 【取得所有留言】
app.get('/api/messages', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from
            ('messages') // 你的資料表名稱
            .select('*')
            .order('created_at', { ascending: false }); // 最新的留言排在最前面

        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: '無法讀取資料庫' });
    }
});

// 【新增一筆留言】
app.post('/api/messages', async (req, res) => {
    try {
        const { content, image_url } = req.body;

        if (!content) return res.status(400).json({ error: '內容不能為空' });

        const { data, error } = await supabase
            .from('messages')
            .insert([{ content, image_url }]); // 存入文字與圖片網址

        if (error) throw error;
        res.json({ success: true, message: '留言已成功存入！' });
    } catch (error) {
        res.status(500).json({ error: '儲存失敗' });
    }
});


// 【點讚功能：增加讚數】
//  PATCH 或 POST 都可以，這裡用 POST 並帶入留言 ID
// 【點讚功能：增加或減少讚數】
app.post('/api/messages/:id/like', async (req, res) => {
    try {
        const { id } = req.params;
        const { action } = req.body; // 前端傳送 'add' 或 'remove'

        // 1. 先從 Supabase 抓出目前的讚數
        const { data: msg, error: fetchError } = await supabase
            .from('messages')
            .select('likes')
            .eq('id', id)
            .single();

        if (fetchError) throw fetchError;

        // 2. 計算新的讚數
        let currentLikes = msg.likes || 0;
        let newLikes = (action === 'add') ? currentLikes + 1 : currentLikes - 1;
        
        // 安全檢查：讚數最低為 0
        newLikes = Math.max(0, newLikes);

        // 3. 更新回 Supabase
        const { error: updateError } = await supabase
            .from('messages')
            .update({ likes: newLikes })
            .eq('id', id);

        if (updateError) throw updateError;

        res.json({ success: true, newLikes });
    } catch (error) {
        console.error('點讚失敗:', error);
        res.status(500).json({ error: '無法處理讚數更新' });
    }
});

// 4. 啟動伺服器
app.listen(PORT, () => {
    console.log(`後端伺服器正在運行：http://localhost:${PORT}`);
});