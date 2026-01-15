//ページ読み込み時の処理
document.addEventListener('DOMContentLoaded', () => {
    loadChatHistory();//チャット履歴読み込み

    //送信ボタンのイベントリスナー
    document.getElementById('sendButton').addEventListener('click', sendMessage);

    //Enterキーで送信（Shift＋Enterで改行）
    document.getElementById('messageInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    //サジェスションボタンのイベントリスナー
    document.querySelectorAll('.suggestion-btn').forEach(button => {
        button.addEventListener('click', () => {
            const message = button.getAttribute('data-message');
            document.getElementById('messageInput').value = message;
            sendMessage();
        });
    });
});

