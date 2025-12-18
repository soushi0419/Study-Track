//ページ読み込み時に学習記録を表示
document.addEventListener('DOMContentLoaded', () => {
    loadRecords();
});

//学習記録を取得
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

