const { json } = require("body-parser");

//ページ読み込み時に教科一覧を表示
document.addEventListener('DOMContentLoaded', () => {
    loadSubjects();
});

//教科フォーム送信時の処理
document.getElementById('subject-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('subject-name').value;
    const comment = document.getElementById('comment').value;

    try {
        const response = await fetch('/api/subject', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: name,
                comment: comment
            })
        });

        const data = await response.json();

        if (data.success) {
            alert('教科を登録しました');
            document.getElementById('subject-form').reset();
            loadSubjects();
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('エラー:', error);
        alert('通信エラーが発生しました。');
    }
});