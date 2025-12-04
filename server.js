const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Разрешаем серверу отдавать твои HTML/CSS/IMG файлы
app.use(express.static(__dirname));
app.use(bodyParser.json());

// Подключение к Базе Данных (читаем настройки из сервера)
const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password', 
    database: process.env.DB_NAME || 'kitchen_shop',
    port: process.env.DB_PORT || 3306
});

// Добавляем специальный код, чтобы соединение не падало при простое
setInterval(() => {
    db.query('SELECT 1');
}, 5000);

// Проверка подключения
db.connect((err) => {
    if (err) {
        console.error('Ошибка подключения к базе:', err);
        return;
    }
    console.log('MySQL подключен успешно!');
});

// --- МАРШРУТЫ ---

// 1. Отдать главную страницу при заходе на сайт
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 2. Регистрация (Получаем данные -> Сохраняем в БД)
app.post('/register', (req, res) => {
    const { username, email, password } = req.body;
    const sql = 'INSERT INTO users (username, email, password) VALUES (?, ?, ?)';
    
    db.query(sql, [username, email, password], (err, result) => {
        if (err) {
            // Если такой email уже есть
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ success: false, message: 'Такой Email уже занят' });
            }
            return res.status(500).json({ success: false, message: 'Ошибка базы данных' });
        }
        res.json({ success: true, message: 'Успешно зарегистрирован' });
    });
});

// 3. Вход (Получаем данные -> Ищем в БД)
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    const sql = 'SELECT * FROM users WHERE email = ?';

    db.query(sql, [email], (err, results) => {
        if (err) return res.status(500).json({ success: false, message: 'Ошибка сервера' });
        
        if (results.length === 0) {
            return res.status(401).json({ success: false, message: 'Пользователь не найден' });
        }

        const user = results[0];
        if (user.password === password) {
            res.json({ 
                success: true, 
                user: { username: user.username, email: user.email } 
            });
        } else {
            res.status(401).json({ success: false, message: 'Неверный пароль' });
        }
    });
});

// Запуск
app.listen(port, () => {
    console.log(`Сайт запущен: http://localhost:${port}`);
});