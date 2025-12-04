const express = require('express');
const path = require('path');
const app = express();

// frontendのHTMLとCSSを配信する設定
app.use(express.static(path.join(__dirname, '../frontend')));

// JSONデータを受け取れるようにする設定
app.use(express.json());

// サーバーをポート3000で起動
app.listen(3000, () => {
  console.log('サーバーが http://localhost:3000 で起動しました');
});