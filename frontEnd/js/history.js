// ページ読み込み時に学習記録を表示
document.addEventListener('DOMContentLoaded', () => {
    loadRecords();// 学習記録の読み込み
    displayCalendar();// カレンダーの初期表示
    // カレンダーの月移動ボタンのイベントリスナー
    document.getElementById('prevMonth').addEventListener('click', () => {
        currentMonth.setMonth(currentMonth.getMonth() - 1);
        displayCalendar();
    });
    document.getElementById('nextMonth').addEventListener('click', () => {
        currentMonth.setMonth(currentMonth.getMonth() + 1);
        displayCalendar();
    });
});

// カレンダーの月を管理する変数
let currentMonth = new Date();

// カレンダーを表示
async function displayCalendar() {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth() + 1;

    document.getElementById('currentMonth').textContent = `${year}年${month}月`;

    try {
        const response = await fetch(`/api/records/${year}/${month}`);
        const data = await response.json();

        if (data.success) {
            renderCalendarDays(year, month, data.records);
            displayRecords(data.records);
        }
    } catch (error) {
        console.error('エラー:', error);
    }
}

// カレンダーの日付をレンダリング
function renderCalendarDays(year, month, records) {
    const calendarDiv = document.getElementById('calendar');
    calendarDiv.innerHTML = '';

    const firstDay = new Date(year, month - 1, 1);//その月の１日のオブジェクトの取得
    const lastDay = new Date(year, month, 0);//その月の最終日のオブジェクトの取得
    const startDate = firstDay.getDay();//その月の１日の曜日を取得
    const daysInMonth = lastDay.getDate();//その月の日数を取得

    //前月の日付を埋める
    const prevLastDay = new Date(year, month - 1, 0).getDate();
    for (let i = startDate - 1; i >= 0; i--) {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'calendar-day other-month';
        dayDiv.textContent = prevLastDay - i;
        calendarDiv.appendChild(dayDiv);
    }

    //当月の日付を表示
    const recordDates = records.map(record => new Date(record.date).getDate());
    const today = new Date();

    for (let day = 1; day <= daysInMonth; day++) {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'calendar-day';
        dayDiv.textContent = day;

        //本日の場合
        if (year === today.getFullYear() && month - 1 === today.getMonth() && day === today.getDate()) {
            dayDiv.classList.add('today');
        }

        //記録がある日の場合
        if (recordDates.includes(day)) {
            dayDiv.classList.add('has-record');
        }

        calendarDiv.appendChild(dayDiv);
    }

    //翌月の日付を埋める
    const totalCells = calendarDiv.children.length;
    const remainingCells = 42 - totalCells;
    for (let i = 1; i <= remainingCells; i++) {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'calendar-day other-month';
        dayDiv.textContent = i;
        calendarDiv.appendChild(dayDiv);
    }
}

// 学習記録を取得
async function loadRecords() {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;

    try {
        const response = await fetch(`/api/records/${year}/${month}`);
        const data = await response.json();

        if (data.success) {
            displayRecords(data.records);
        }
    } catch (error) {
        console.error('エラー:', error);
    }
}

// 学習記録を表示
function displayRecords(records) {
    const recordList = document.getElementById('recordList');

    if (records.length === 0) {
        recordList.innerHTML = '<p class="message">記録がありません</p>';
        return;
    }

    let html = '';
    records.forEach(record => {
        const recordDate = new Date(record.date);
        const displayDate = `${recordDate.getFullYear()}年${recordDate.getMonth() + 1}月${recordDate.getDate()}日`;

        html += `
      <div class="record-item" data-id="${record.id}">
        <div class="record-info">
          <div class="record-header">
            <span class="record-date">${displayDate}</span>
            <span class="record-time">${record.hours}時間${record.minutes}分</span>
          </div>
          <div class="record-subject">
            <span class="subject-dot" style="background-color: #007BFF;"></span>
            ${record.subject}
          </div>
          <div class="record-type">
            ${record.study_type === 'school' ? '学校学習' : '自主学習'}
          </div>
        </div>
        ${record.comment ? `<div class="record-comment">${record.comment}</div>` : ''}
        <button class="delete-record-btn" data-id="${record.id}" onclick="deleteRecord(${record.id})">削除</button>
      </div>
    `;
    });

    recordList.innerHTML = html;
}

// 学習記録を削除する
async function deleteRecord(id) {
    if (!confirm('この記録を削除してもよろしいですか？')) {
        return;
    }

    try {
        const response = await fetch(`/api/records/${id}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
            alert('記録を削除しました。');
            loadRecords();
            displayCalendar();
        } else {
            alert('削除に失敗しました')
        }
    } catch (error) {
        console.error('エラー:', error);
        alert('通信エラーが発生しました');
    }
}