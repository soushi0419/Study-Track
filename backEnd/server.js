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

        const firstDay = new Date(year, month - 1, 1);
        const lastDay = new Date(year, month, 0);

        const query = `SELECT WEEK(date, 1) - WEEK(DATE_SUB(date, INTERVAL DAYOFMONTH(date)-1 DAY), 1) + 1 as week_num, SUM(hours * 60 + minutes) as total_minutes FROM records WHERE YEAR(date) = ? AND MONTH(date) = ? GEOUP BY week_num ORDER BY week_num`;

        const [rows] = await pool.query(query, [year, month]);

        const weeklyData = [];
        const maxWeeks = Math.ceil(lastDay.getDate() / 7);

        for (let i = 1; i <= maxWeeks; i++) {
            const weekData = rows.find(row => row.week_num === i);
            const totalMinutes = weekData ? weekData.total_minutes : 0;
            const hours = Math.round((totalMinutes / 60) * 10) / 10;

            weeklyData.push({
                week: i,
                hours: hours
            });
        }

        res.json({ success: true, data: weeklyData });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'エラーが発生しました。' });
    }
});

//月別の勉強時間を取得するエンドポイント
app.get('/api/study-time/monthly/:year/:month', async (req, res) => {
    try {
        const { year, month } = req.params;
        const currentDate = new Date(year, month - 1, 1);

        const monthlyData = [];

        for (let i = 11; i >= 0; i--) {
            const targetDate = new Date(currentDate);
            targetDate.setMonth(currentDate.getMonth() - i);

            const targetYear = targetDate.getFullYear();
            const targetMonth = targetDate.getMonth() + 1;

            const query = `SELECT SUM(hours * 60 + minutes) as total_minutes FROM records WHERE YEAR(date) = ? AND MONTH(date) = ?`;

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

//曜日別の勉強時間を取得するエンドポイント
app.get('/api/study-time/daily/:year/:month', async (req, res) => {
    try {
        const { year, month } = req.params;

        const query = `SELECT DAYOFWEEK(date) - 1 as day_of_week, SUM(hours * 60 + minutes) as total_minutes FROM records WHERE YEAE(date) = ? AND MONTH(date) = ? GROUP BY day_of_week ORDER BY day_of_week`;

        const [rows] = await pool.query(query, [year, month]);

        const dayNames = ['日', '月', '火', '水', '木', '金', '土',];

        const dailyData = dayNames.map((dayNames, index) => {
            const dayData = rows.find(row => row.day_of_week === index);
            const totalMinutes = dayData ? dayData.total_minutes : 0;
            const hours = Math.round((totalMinutes / 60) * 10) / 10;

            return {
                day: dayNames,
                hours: hours
            };
        });

        res.json({ success: true, data: dailyData });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'エラーが発生しました' });
    }
});