const { use } = require("react");

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

//メッセージを送信
async function sendMessage() {
    const input = document.getElementById('message');
    const message = input.value.trim();

    if (!message) {
        return;
    }

    //入力欄をクリアして無効化
    input.value = '';
    input.disabled = true;
    document.getElementById('sendButton').disabled = true;

    //ユーザーメッセージを表示
    addMessageToChat(message, 'user');

    //ローディングメッセージを表示
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'loading-message';
    loadingDiv.textContent = '考え中...';
    loadingDiv.id = 'loading';
    document.getElementById('chatMessages').appendChild(loadingDiv);
    scrollTOBottom();

    try {
        // サーバーにメッセージを送信
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message: message })
        });

        const data = await response.json();

        // ローディングメッセージを削除
        document.getElementById('loading').remove();

        if (data.success) {
            // AIの返答を表示
            addMessageToChat(data.response, 'ai');
            // チャット履歴を更新
            loadChatHistory();
        } else {
            addMessageToChat('エラーが発生しました: ' + data.message, 'ai');
        }
    } catch (error) {
        console.error('送信エラー:', error);
        document.getElementById('loading').remove();
        addMessageToChat('通信エラーが発生しました。', 'ai');
    } finally {
        // 入力欄を再度有効化
        input.disabled = false;
        document.getElementById('sendButton').disabled = false;
        input.focus();
    }
}

//メッセージをチャットエリアに追加
function addMessageToChat(text, type) {
    const messagesDiv = document.getElementById('chatMessage');
    const messageDiv = document.createElement('div');
    messageDiv.className = `,essage ${type}-message`;
    messageDiv.textContent = text;
    messagesDiv.appendChild(messageDiv);
    scrollTOBottom();
}

//チャットエリアを最下部にスクロール
function scrollTOBottom() {
    const messagesDiv = document.getElementById('chatMessages');
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

//チャット履歴読み込み
async function loadChatHistory() {
    try {
        const response = await fetch('/api/chat-history');
        const data = await response.json();

        if (data.success && data.history.length > 0) {
            displayChatHistory(data.history);
        }
    } catch (error) {
        console.error('履歴読み込みエラー', error);
    }
}

//チャット履歴を表示
function displayChatHistory(history) {
    const historyDiv = document.getElementById('chathitory');

    if (history.length === 0) {
        historyDiv.innerHTML = '<p class="no-history">まだ会話履歴がありません</p>';
        return;
    }

    let html = '';
    history.forEach(item => {
        const date = new Date(item.created_at);
        const timeStr = `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;

        html += `
            <div class="history-item" onclick="loadHistoryToChat('${escapeHtml(item.user_message)}', '${escapeHtml(item.ai_response)}')">
                <div class="history-user">質問: ${escapeHtml(item.user_message)}</div>
                <div class="history-ai">${escapeHtml(item.ai_response)}</div>
                <div class="history-time">${timeStr}</div>
            </div>
        `;
    });

    historyDiv.innerHTML = html;
}

//履歴からチャットに読み込む
function loadHistoryToChat(userMessage, aiResponse) {
    //既存のメッセージをクリア
    const messageDiv = document.getElementById('chatMessages');
    const welcomeMsg = messagesDiv.querySelector('.welcome-message');
    messageDiv.innerHTML = '';
    if(welcomeMsg){
        messageDiv.appendChild(welcomeMsg);
    }

    //履歴のメッセージを表示
    addMessageToChat(userMessage,'user');
    addMessageToChat(aiResponse,'ai');
}

