const express = require('express');
const path = require('path');
const pool = require('./db');
const app = express();

// frontendのHTMLとCSSを配信する設定
app.use(express.static(path.join(__dirname, '../frontend')));

// JSONデータを受け取れるようにする設定
app.use(express.json());

// 学習記録を保存するエンドポイント
app.post('/api/records', async (req, res) => {
    try {
        const { date, subject, hours, minutes, study_type, comment } = req.body;

        const query = 'INSERT INTO records (date, subject, hours, minutes, study_type, comment) VALUES (?, ?, ?, ?, ?, ?)';

        await pool.query(query, [date, subject, hours, minutes, study_type, comment]);

        res.json({ success: true, message: '記録を保存しました' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'エラーが発生しました' });
    }
});
// 教科を保存するエンドポイント
app.post('/api/subjects', async (req, res) => {
    try {
        const { name, comment } = req.body;

        const query = 'INSERT INTO subjects (name, comment) VALUES (?, ?)';

        await pool.query(query, [name, comment]);

        res.json({ success: true, message: '教科を登録しました' });
    } catch (error) {
        console.error(error);
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(400).json({ success: false, message: '同じ教科名は既に登録されています' });
        } else {
            res.status(500).json({ success: false, message: 'エラーが発生しました' });
        }
    }
});

// 教科一覧を取得するエンドポイント
app.get('/api/subjects', async (req, res) => {
    try {
        const query = 'SELECT id, name, comment, color FROM subjects ORDER BY created_at DESC';

        const [rows] = await pool.query(query);

        res.json({ success: true, subjects: rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'エラーが発生しました' });
    }
});

// 教科を削除するエンドポイント
app.delete('/api/subjects/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const query = 'DELETE FROM subjects WHERE id = ?';

        await pool.query(query, [id]);

        res.json({ success: true, message: '教科を削除しました' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'エラーが発生しました' });
    }
});

// サーバーをポート3000で起動
app.listen(3000, () => {
    console.log('サーバーが http://localhost:3000 で起動しました');
});