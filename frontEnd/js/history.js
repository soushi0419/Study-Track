// ページ読み込み時に学習記録を表示
document.addEventListener('DOMContentLoaded', () => {
    loadRecords();
});

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
      <div class="record-item">
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
      </div>
    `;
    });

    recordList.innerHTML = html;
}