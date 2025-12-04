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

// サーバーをポート3000で起動
app.listen(3000, () => {
  console.log('サーバーが http://localhost:3000 で起動しました');
});