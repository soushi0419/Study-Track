const dotenv = require("dotenv");
dotenv.config();


const express = require('express');
const path = require('path');
const pool = require('./db');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const app = express();

// Gemini APIの初期化
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// frontendのHTMLとCSSを配信する設定
app.use(express.static(path.join(__dirname, '../frontend')));

// JSONデータを受け取れるようにする設定
app.use(express.json());

//サーバーポートを3000で起動
app.listen(3000, '0.0.0.0', () => {
    console.log('サーバーが http://localhost:3000 で起動しました');
});

// 学習記録を保存するエンドポイント
app.post('/api/records', async (req, res) => {
    try {
        const { date, subject, hours, minutes, study_type, comment } = req.body;

        const query = 'INSERT INTO records (date, subject, hours, minutes, study_type, comment) VALUES (?, ?, ?, ?, ?, ?)';

        await pool.query(query, [date, subject, hours, minutes, study_type, comment]);

        res.json({ success: true, message: '記録を保存しました' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'エラーが発生しました' });
    }
});
// 教科を保存するエンドポイント
app.post('/api/subjects', async (req, res) => {
    try {
        const { name, comment } = req.body;

        const query = 'INSERT INTO subjects (name, comment) VALUES (?, ?)';

        await pool.query(query, [name, comment]);

        res.json({ success: true, message: '教科を登録しました' });
    } catch (error) {
        console.error(error);
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(400).json({ success: false, message: '同じ教科名は既に登録されています' });
        } else {
            res.status(500).json({ success: false, message: 'エラーが発生しました' });
        }
    }
});

//チャット履歴を取得するエンドポイント
app.get('/api/chat-history', async (req, res) => {
    try {
        const query = 'SELECT * FROM chat_history ORDER BY created_at DESC LIMIT 50';
        const [rows] = await pool.query(query);

        res.json({ success: true, history: rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'エラーが発生しました' });
    }
});

//AIチャットメッセージを送信するエンドポイント
app.post('/api/chat', async (req, res) => {
    try {
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({ success: false, message: 'メッセージが必要です' });
        }

        // 現在の月の学習データを取得
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth() + 1;

        // 月間目標を取得
        const goalQuery = 'SELECT target_hours FROM monthly_goals WHERE year = ? AND month = ?';
        const [goalRows] = await pool.query(goalQuery, [year, month]);
        const goalHours = goalRows.length > 0 ? goalRows[0].target_hours : 0;

        // 月間勉強時間を取得
        const studyQuery = 'SELECT SUM(hours * 60 + minutes) as total_minutes FROM records WHERE YEAR(date) = ? AND MONTH(date) = ?';
        const [studyRows] = await pool.query(studyQuery, [year, month]);
        const totalMinutes = studyRows[0].total_minutes || 0;
        const studyHours = Math.floor(totalMinutes / 60);

        // 教科別の勉強時間を取得
        const subjectQuery = `
            SELECT subject, SUM(hours * 60 + minutes) as total_minutes 
            FROM records 
            WHERE YEAR(date) = ? AND MONTH(date) = ?
            GROUP BY subject
            ORDER BY total_minutes DESC
        `;
        const [subjectRows] = await pool.query(subjectQuery, [year, month]);
        const subjectStats = subjectRows.map(row => ({
            subject: row.subject,
            hours: Math.round((row.total_minutes / 60) * 10) / 10
        }));

        // 最近7日間の勉強記録を取得
        const recentQuery = `
            SELECT date, hours, minutes, subject 
            FROM records 
            WHERE date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            ORDER BY date DESC
        `;
        const [recentRows] = await pool.query(recentQuery);

        // Gemini APIに渡すコンテキストを構築
        const context = `
あなたは学習支援AIアシスタントです。ユーザーの学習記録を基に、適切なアドバイスや励ましを提供してください。

【ユーザーの現在の状況】
- 今月の目標勉強時間: ${goalHours}時間
- 今月の実際の勉強時間: ${studyHours}時間
- 達成率: ${goalHours > 0 ? Math.round((studyHours / goalHours) * 100) : 0}%

【教科別の勉強時間（今月）】
${subjectStats.length > 0 ? subjectStats.map(s => `- ${s.subject}: ${s.hours}時間`).join('\n') : '- まだ記録がありません'}

【最近7日間の勉強記録】
${recentRows.length > 0 ? recentRows.map(r => `- ${r.date}: ${r.subject} ${r.hours}時間${r.minutes}分`).join('\n') : '- まだ記録がありません'}

ユーザーからの質問やメッセージに対して、以下を心がけて回答してください：
1. 具体的で実践的なアドバイスを提供する
2. データに基づいた客観的な分析を行う
3. 前向きで励ましのある口調を使う
4. 必要に応じて勉強法や時間管理のテクニックを提案する
5. 日本語で簡潔に答える（200文字程度）

ユーザーのメッセージ: ${message}
`;

        // Gemini APIを呼び出し
        const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
        const result = await model.generateContent(context);
        const response = await result.response;
        const aiResponse = response.text();

        // チャット履歴をデータベースに保存
        const saveQuery = 'INSERT INTO chat_history (user_message, ai_response) VALUES (?, ?)';
        await pool.query(saveQuery, [message, aiResponse]);

        res.json({
            success: true,
            response: aiResponse
        });

    } catch (error) {
        console.error('Chat API Error:', error);
        res.status(500).json({
            success: false,
            message: 'AIとの通信中にエラーが発生しました',
            error: error.message
        });
    }
});

// 教科一覧を取得するエンドポイント
app.get('/api/subjects', async (req, res) => {
    try {
        const query = 'SELECT id, name, comment, color FROM subjects ORDER BY created_at DESC';

        const [rows] = await pool.query(query);

        res.json({ success: true, subjects: rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'エラーが発生しました' });
    }
});

// 教科を削除するエンドポイント
app.delete('/api/subjects/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const query = 'DELETE FROM subjects WHERE id = ?';

        await pool.query(query, [id]);

        res.json({ success: true, message: '教科を削除しました' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'エラーが発生しました' });
    }
});

//月別目標時間を保存するエンドポイント
app.post('/api/monthly-goals', async (req, res) => {
    try {
        const { year, month, target_hours } = req.body;

        const query = 'INSERT INTO monthly_goals (year, month, target_hours) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE target_hours = ?, updated_at = CURRENT_TIMESTAMP';

        await pool.query(query, [year, month, target_hours, target_hours]);

        res.json({ success: true, message: '目標を登録しました' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'エラーが発生しました' });
    }
});

//月別目標時間を取得するエンドポイント
app.get('/api/monthly-goals/:year/:month', async (req, res) => {
    try {
        const { year, month } = req.params;

        const query = 'SELECT target_hours FROM monthly_goals WHERE year = ? AND month = ?';

        const [rows] = await pool.query(query, [year, month]);

        if (rows.length > 0) {
            res.json({ success: true, target_hours: rows[0].target_hours });
        } else {
            res.json({ success: true, target_hours: 0 });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'エラーが発生しました' });
    }
});

//月別の勉強時間を集計するエンドポイント
app.get('/api/study-time/:year/:month', async (req, res) => {
    try {
        const { year, month } = req.params;

        const query = 'SELECT SUM(hours * 60 + minutes) as total_minutes From records WHERE YEAR(date) = ? AND MONTH(date) = ?';

        const [rows] = await pool.query(query, [year, month]);

        const total_minutes = rows[0].total_minutes || 0;
        const hours = Math.floor(total_minutes / 60);
        const minutes = total_minutes % 60;

        res.json({ success: true, hours: hours, minutes: minutes, total_minutes: total_minutes });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'エラーが発生しました' });
    }
});

//月別の学習記録一覧を取得するエンドポイント
app.get('/api/records/:year/:month', async (req, res) => {
    try {
        const { year, month } = req.params;

        const query = 'SELECT * FROM records WHERE YEAR(date) = ? AND MONTH(date) = ? ORDER BY date DESC';

        const [rows] = await pool.query(query, [year, month]);

        res.json({ success: true, records: rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'エラーが発生しました' });
    }
});

// 学習記録を削除するエンドポイント
app.delete('/api/records/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const query = 'DELETE FROM records WHERE id = ?';

        await pool.query(query, [id]);

        res.json({ success: true, message: '記録を削除しました' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'エラーが発生しました' });
    }
});

//週別の勉強時間を取得するエンドポイント
app.get('/api/study-time/weekly/:year/:month', async (req, res) => {
    try {
        const { year, month } = req.params;

        // その月の日付ごとの勉強時間を取得
        const query = `
            SELECT 
                DAY(date) as day_num,
                hours,
                minutes
            FROM records
            WHERE YEAR(date) = ? AND MONTH(date) = ?
            ORDER BY DAY(date)
        `;

        const [rows] = await pool.query(query, [year, month]);

        // 月の最終日を取得
        const lastDay = new Date(year, month, 0).getDate();

        // 日付ごとのデータをマップに変換（分単位で保存）
        const dayMap = {};
        rows.forEach(row => {
            const totalMinutes = (row.hours * 60) + row.minutes;
            if (!dayMap[row.day_num]) {
                dayMap[row.day_num] = 0;
            }
            dayMap[row.day_num] += totalMinutes;
        });

        // 週ごとに集計（1日から7日ずつ区切る）
        const weeklyData = [];
        let weekNum = 1;

        for (let startDay = 1; startDay <= lastDay; startDay += 7) {
            let weekMinutes = 0;
            const endDay = Math.min(startDay + 6, lastDay);

            for (let day = startDay; day <= endDay; day++) {
                weekMinutes += dayMap[day] || 0;
            }

            const hours = Math.round((weekMinutes / 60) * 10) / 10;
            weeklyData.push({
                week: weekNum,
                hours: hours
            });
            weekNum++;
        }

        res.json({ success: true, data: weeklyData });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'エラーが発生しました' });
    }
});

// 【新規】過去12ヶ月の勉強時間を取得するエンドポイント
app.get('/api/study-time/monthly/:year/:month', async (req, res) => {
    try {
        const { year, month } = req.params;
        const currentDate = new Date(year, month - 1, 1);

        const monthlyData = [];

        // 過去12ヶ月分のデータを取得
        for (let i = 11; i >= 0; i--) {
            const targetDate = new Date(currentDate);
            targetDate.setMonth(currentDate.getMonth() - i);

            const targetYear = targetDate.getFullYear();
            const targetMonth = targetDate.getMonth() + 1;

            const query = `
                SELECT SUM(hours * 60 + minutes) as total_minutes
                FROM records
                WHERE YEAR(date) = ? AND MONTH(date) = ?
            `;

            const [rows] = await pool.query(query, [targetYear, targetMonth]);
            const totalMinutes = rows[0].total_minutes || 0;
            const hours = Math.round((totalMinutes / 60) * 10) / 10;

            monthlyData.push({
                year: targetYear,
                month: targetMonth,
                hours: hours
            });
        }

        res.json({ success: true, data: monthlyData });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'エラーが発生しました' });
    }
});

// 【新規】曜日別の勉強時間を取得するエンドポイント
app.get('/api/study-time/daily/:year/:month', async (req, res) => {
    try {
        const { year, month } = req.params;

        // 曜日別に集計（DAYOFWEEK: 1=日曜日, 2=月曜日, ..., 7=土曜日）
        const query = `
            SELECT 
                DAYOFWEEK(date) as day_of_week,
                SUM(hours * 60 + minutes) as total_minutes
            FROM records
            WHERE YEAR(date) = ? AND MONTH(date) = ?
            GROUP BY DAYOFWEEK(date)
            ORDER BY DAYOFWEEK(date)
        `;

        const [rows] = await pool.query(query, [year, month]);

        // 曜日名の配列（日曜日から）
        const dayNames = ['日', '月', '火', '水', '木', '金', '土'];

        // 全ての曜日のデータを用意
        const dailyData = dayNames.map((dayName, index) => {
            // DAYOFWEEKは1から始まるので、index + 1で対応
            const dayData = rows.find(row => row.day_of_week === index + 1);
            const totalMinutes = dayData ? dayData.total_minutes : 0;
            const hours = Math.round((totalMinutes / 60) * 10) / 10;

            return {
                day: dayName,
                hours: hours
            };
        });

        res.json({ success: true, data: dailyData });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'エラーが発生しました' });
    }
});