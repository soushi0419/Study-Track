const { json } = require("body-parser");

//ページ読み込み時に教科一覧を表示
document.addEventListener('DOMContentLoaded', () => {
    loadSubjects();
});