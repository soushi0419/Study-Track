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

//教科一覧を読み込む関数
async function loadSubjects() {
    try {
        const response = await fetch('/api/subjects');
        const data = await response.json();

        if (data.success) {
            displaySubjects(data.Subjects);
        }
    } catch (error) {
        console.error('エラー:', error);
    }
}

//教科一覧を表示する関数
function displaySubjects(subjects) {
    const listDiv = document.querySelector('.list');

    if(subjects.length === 0) {
        listDiv.innerHTML = '<p class="message">まだ強化が登録されていません</p>';
        document.querySelector('.submit-button').classList.remove('show');
        return;
    }

    let html = '';
    subjects.forEach(subject => {
        html += `
        <div class="subject-item">
         <input type="checkbox" class="subject-checkbox" data-id="${subject.id}">
         <div class="subject-item-content">
          <div class="subject-item-name">${subject.name}</div>
          ${subject.comment ? `<div class="subject-item-comment">${subject.comment}</div>`:''}
         </div>
        </div>
        `;
    });

    listDiv.innerHTML = html;
    document.querySelector('.submit-button').classList.add('show');

    //削除ボタンのイベント設定
    document.querySelector('.submit-button').addEventListener('click', deleteSelectedSubjects);
}