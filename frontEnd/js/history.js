// カレンダーの月を管理する変数
let currentMonth = new Date();

//グラフインスタンスを保持する変数
let studyChart = null;

// ページ読み込み時に学習記録を表示
document.addEventListener('DOMContentLoaded', () => {
    loadRecords();// 学習記録の読み込み
    displayCalendar();// カレンダーの初期表示
    displayGoalProgress(); //円グラフの表示
    displayStudyChart('week');//グラフの初期表示
    // 月移動ボタンのイベントリスナー
    document.getElementById('prevMonth').addEventListener('click', () => {
        currentMonth.setMonth(currentMonth.getMonth() - 1);
        displayCalendar();
        displayGoalProgress();
        updateChart();
    });
    document.getElementById('nextMonth').addEventListener('click', () => {
        currentMonth.setMonth(currentMonth.getMonth() + 1);
        displayCalendar();
        displayGoalProgress();
        updateChart();
    });

    //グラフ切り替えのイベントリスナー
    document.querySelectorAll('input[name="graph-type"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const graphType = e.target.value;
            displayStudyChart(graphType);
        });
    });
});

//グラフを表示する
async function displayStudyChart(type) {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth() + 1;

    let endpoint = '';
    let labels = [];
    let data = [];
    let chartLabel = '';

    try {
        if (type === 'week') {
            // 週別グラフ
            endpoint = `/api/study-time/weekly/${year}/${month}`;
            const response = await fetch(endpoint);
            const result = await response.json();

            if (result.success) {
                labels = result.data.map(item => `第${item.week}週`);
                data = result.data.map(item => item.hours);
                chartLabel = '週別勉強時間';
            }
        } else if (type === 'month') {
            // 月別グラフ
            endpoint = `/api/study-time/monthly/${year}/${month}`;
            const response = await fetch(endpoint);
            const result = await response.json();

            if (result.success) {
                labels = result.data.map(item => `${item.year}年${item.month}月`);
                data = result.data.map(item => item.hours);
                chartLabel = '月別勉強時間';
            }
        } else if (type === 'day') {
            // 曜日別グラフ
            endpoint = `/api/study-time/daily/${year}/${month}`;
            const response = await fetch(endpoint);
            const result = await response.json();

            if (result.success) {
                labels = result.data.map(item => `${item.day}曜日`);
                data = result.data.map(item => item.hours);
                chartLabel = '曜日別勉強時間';
            }
        }

        renderChart(labels, data, chartLabel);
    } catch (error) {
        console.error('グラフデータの取得エラー：', error);
    }
}

// Chart.jsでグラフを描画する
function renderChart(labels, data, chartLabel) {
    const ctx = document.getElementById('studyChart').getContext('2d');

    //既存のグラフがあれば破壊
    if (studyChart) {
        studyChart.destroy();
    }

    //新しいグラフの生成
    studyChart = new chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: chartLabel,
                data: data,
                backgroundColor: 'rgba(54,162,235,0.6)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callbacks: function (value) {
                            return value + '時間';
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    callback: {
                        label: function (context) {
                            return context.parsed.y + '時間';
                        }
                    }
                }
            }
        }
    });
}

//現在選択中のグラフタイプで更新する
function updateChart() {
    const selectedType = document.querySelector('input[name="graph-type]:checked').value;
    displayStudyChart(selectedType);
}

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

// 目標達成率を計算して円グラフを表示
async function displayGoalProgress() {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth() + 1;

    try {
        //目標時間の取得
        const goalResponse = await fetch(`/api/monthly-goals/${year}/${month}`);
        const goalData = await goalResponse.json();
        const goalHours = goalData.target_hours || 0;

        //学習時間の取得
        const studyResponse = await fetch(`/api/study-time/${year}/${month}`);
        const studyData = await studyResponse.json();
        const studyHours = studyData.hours || 0;

        //達成率の計算
        let achievementPercent = 0;
        if (goalHours > 0) {
            achievementPercent = Math.min((studyHours / goalHours) * 100, 100);
        }

        updateProgressCircle(achievementPercent);

        updateGoalInfo(year, month, goalHours, studyHours, achievementPercent);
    } catch (error) {
        console.error('エラー:', error);
    }
}

// 達成率円グラフの更新
function updateProgressCircle(percent) {
    const progressFill = document.getElementById('progressFill');
    const achievementPercent = document.getElementById('achievementPercent');

    //パーセンテージの表示
    achievementPercent.textContent = percent;

    //円グラフのオフセット計算
    const circumference = 339.39;
    const offset = circumference - (circumference * percent) / 100;
    progressFill.style.strokeDashoffset = offset;
}

function updateGoalInfo(year, month, goalHours, studyHours, achievementPercent) {
    //残り日数の計算
    const today = new Date();
    const lastDay = new Date(year, month, 0);
    const remainingDays = Math.max(0, lastDay.getDate() - today.getDate());

    //１日当たりの目標時間の計算
    const remainingHours = Math.max(0, goalHours - studyHours);
    const dailyGoal = remainingDays > 0 ? Math.ceil((remainingHours / remainingDays) * 10) / 10 : 0;

    //画面に表示
    document.getElementById('remainingDays').textContent = remainingDays;
    document.getElementById('dailyGoal').textContent = dailyGoal;
    document.getElementById('monthlyGoal').textContent = goalHours;
    document.getElementById('currentStudyTime').textContent = studyHours;

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
                <div class="record-comment-cell">
                    ${record.comment ? `<div class="record-comment">${record.comment}</div>` : ''}
                </div>
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
            displayGoalProgress();
            updateChart();
        } else {
            alert('削除に失敗しました')
        }
    } catch (error) {
        console.error('エラー:', error);
        alert('通信エラーが発生しました');
    }
}