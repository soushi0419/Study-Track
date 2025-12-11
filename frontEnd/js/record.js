//ページ読み込み時に教科一覧取得
document.addEventListener('DOMContentLoaded', () => {
  loadSubjects();
  setTodayDate();
});

//本日の日付を初期値として設定する
function setTodayDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');

  document.getElementById('year').value = year;
  document.getElementById('month').value = parseInt(month);
  document.getElementById('day').value = parseInt(day);
}

//教科一覧を読み込む
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

//教科一覧をドロップダウンに表示する
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
//ページ読み込み時に現在の目標時間を取得し表示する
async function loadMonthlyGoal() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;

  try {
    const response = await fetch(`/api/monthly-goals/${year}/${month}`);
    const data = await response.json();

    if (data.success) {
      document.getElementById('target-time-display').textContent = data.target_hours;
      document.getElementById('target-hours').value = data.target_hours;
    }
  } catch (error) {
    console.error('エラー:', error);
  }
}

//目標時間フォーム送信時の処理
document.getElementById('target-from').addEventListener('submit', async (e) => {
  e.preventDefault();

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const target_hours = parseInt(document.getElementById('target-hours').value);

  if (target_hours <= 0) {
    alert('0より大きい値を入力してください');
    return;
  }

  try {
    const response = await fetch('/api/monthly-goals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: Json.stringify({
        year: year,
        month: month,
        target_hour: target_hours
      })
    });

    const data = await response.json();

    if (data.success) {
      alert('目標を設定しました');
      document.getElementById('target-time-display').textContent = target_hours;
      loadMonthlyGoal();
    } else {
      alert('保存に失敗しました')
    }
  } catch (error) {
    console.error('エラー:', error);
    alert('通信エラーが発生しました')
  }
});