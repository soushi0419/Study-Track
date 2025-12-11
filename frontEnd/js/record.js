//ページ読み込み時に教科一覧取得
document.addEventListener('DOMContentLoaded', () => {
  loadSubjects();
});

//教科一覧を読み込む関数
async function loadSubjects() {
  try {
    const response = await fetch('/api/subjects');//サーバーから教科取得
    const data = await response.json();

    if (data.success) {
      displaySubjects(data.subjects);//取得した教科をドロップダウンに表示
    }
  } catch (error) {
    console.error('エラー:', error);
  }
}

//教科一覧をドロップダウンに表示する関数
function displaySubjects(subjects) {
  const subjectSelect = document.getElementById('subject');//ドロップダウンを取得

  subjectSelect.innerHTML = '<option value="">教科を選択してください</option>';//デフォルトオプション

  //教科をドロップダウンに追加
  subjects.forEach(subject => {
    const option = document.createElement('option');
    option.value = subject.name;
    option.textContent = subject.name;
    subjectSelect.appendChild(option);
  });
}

// フォーム送信時の処理
document.getElementById('record-form').addEventListener('submit', async (e) => {
  e.preventDefault(); // ページのリロードを防ぐ

  // フォームから値を取得
  const year = document.getElementById('year').value;
  const month = document.getElementById('month').value;
  const day = document.getElementById('day').value;
  const subject = document.getElementById('subject').value;
  const hours = document.getElementById('hours').value;
  const minutes = document.getElementById('minutes').value;
  const study_type = document.querySelector('input[name="study-type"]:checked').value;
  const comment = document.getElementById('comment').value;

  // 教科が選択されているか確認
  if (!subject) {
    alert('教科を選択してください');
    return;
  }

  // 日付をYYYY-MM-DD形式に変換
  const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  // サーバーにデータを送信
  try {
    const response = await fetch('/api/records', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        date: date,
        subject: subject,
        hours: parseInt(hours),
        minutes: parseInt(minutes),
        study_type: study_type,
        comment: comment
      })
    });

    const data = await response.json();

    if (data.success) {
      alert('記録を保存しました！');
      document.getElementById('record-form').reset(); // フォームをクリア
    } else {
      alert('保存に失敗しました');
    }
  } catch (error) {
    console.error('エラー:', error);
    alert('通信エラーが発生しました');
  }
});