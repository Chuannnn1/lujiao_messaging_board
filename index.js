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
            .from('messages') // 你的資料表名稱
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
app.post('/api/messages/:id/like', async (req, res) => {
    try {
        const { id } = req.params;

        // 這裡我們需要執行「原子增加」，避免兩個人同時按讚時發生錯誤
        // Supabase 的 rpc 功能最準，但簡單做法是先拿再存
        // 專業做法：使用 SQL Function，但我們先用簡單邏輯：
        
        // 1. 先抓取該則留言目前有幾讚
        const { data: msg } = await supabase
            .from('messages')
            .select('likes')
            .eq('id', id)
            .single();

        // 2. 把數字 +1 並更新回去，並返回更新後的完整留言
        const newLikes = (msg.likes || 0) + 1;
        const { data: updatedMsg, error } = await supabase
            .from('messages')
            .update({ likes: newLikes })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        
        // 返回更新後的完整留言物件
        res.json({ 
            success: true, 
            data: updatedMsg 
        });
    } catch (error) {
        res.status(500).json({ error: '點讚失敗' });
    }
});

// 4. 啟動伺服器
app.listen(PORT, () => {
    console.log(`後端伺服器正在運行：http://localhost:${PORT}`);
});