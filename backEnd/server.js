const express = require('express');
const path = require('path');
const pool = require('./db');
const app = express();

// frontendのHTMLとCSSを配信する設定
app.use(express.static(path.join(__dirname, '../frontend')));

// JSONデータを受け取れるようにする設定
app.use(express.json());

//サーバーポートを3000で起動
app.listen(3000, '0.0.0.0', () => {
    console.log('サーバーが http://0.0.0.0:3000 で起動しました');
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