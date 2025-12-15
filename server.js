const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// Подключение к MySQL
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'Qazwsx110$',
    database: 'kitchen_shop',
    port: 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Проверка подключения
pool.getConnection((err, connection) => {
    if (err) {
        console.error('❌ Ошибка подключения к MySQL:', err.message);
        return;
    }
    console.log('✅ Подключение к MySQL успешно!');
    connection.release();
});

// Маршрут для проверки сервера
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Сервер работает' });
});

// Регистрация пользователя
app.post('/api/register', (req, res) => {
    const { username, email, password } = req.body;
    
    console.log('Запрос на регистрацию:', { username, email });
    
    // Проверка обязательных полей
    if (!username || !email || !password) {
        return res.status(400).json({ 
            success: false, 
            message: 'Все поля обязательны для заполнения' 
        });
    }
    
    // Проверка формата email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ 
            success: false, 
            message: 'Некорректный формат email' 
        });
    }
    
    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Ошибка получения соединения:', err);
            return res.status(500).json({ 
                success: false, 
                message: 'Ошибка сервера' 
            });
        }
        
        // Проверяем, существует ли email
        const checkQuery = 'SELECT id FROM users WHERE email = ?';
        connection.query(checkQuery, [email], (checkErr, checkResults) => {
            if (checkErr) {
                connection.release();
                console.error('Ошибка проверки email:', checkErr);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Ошибка сервера' 
                });
            }
            
            if (checkResults.length > 0) {
                connection.release();
                return res.status(400).json({ 
                    success: false, 
                    message: 'Этот email уже зарегистрирован' 
                });
            }
            
            // Создаем пользователя
            const insertQuery = 'INSERT INTO users (username, email, password) VALUES (?, ?, ?)';
            connection.query(insertQuery, [username, email, password], (insertErr, insertResults) => {
                connection.release();
                
                if (insertErr) {
                    console.error('Ошибка создания пользователя:', insertErr);
                    return res.status(500).json({ 
                        success: false, 
                        message: 'Ошибка сервера' 
                    });
                }
                
                console.log('✅ Пользователь создан, ID:', insertResults.insertId);
                
                res.json({ 
                    success: true, 
                    message: 'Регистрация успешно завершена!',
                    userId: insertResults.insertId
                });
            });
        });
    });
});

// Авторизация пользователя
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    
    console.log('Запрос на вход:', { email });
    
    if (!email || !password) {
        return res.status(400).json({ 
            success: false, 
            message: 'Email и пароль обязательны' 
        });
    }
    
    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Ошибка получения соединения:', err);
            return res.status(500).json({ 
                success: false, 
                message: 'Ошибка сервера' 
            });
        }
        
        const query = 'SELECT id, username, email FROM users WHERE email = ? AND password = ?';
        
        connection.query(query, [email, password], (queryErr, results) => {
            connection.release();
            
            if (queryErr) {
                console.error('Ошибка запроса:', queryErr);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Ошибка сервера' 
                });
            }
            
            if (results.length === 0) {
                return res.status(401).json({ 
                    success: false, 
                    message: 'Неверный email или пароль' 
                });
            }
            
            const user = results[0];
            console.log('✅ Успешный вход пользователя:', user.email);
            
            res.json({ 
                success: true, 
                message: 'Авторизация успешна',
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email
                }
            });
        });
    });
});

// Получение информации о пользователе
app.get('/api/user/:id', (req, res) => {
    const userId = req.params.id;
    
    pool.getConnection((err, connection) => {
        if (err) {
            return res.status(500).json({ 
                success: false, 
                message: 'Ошибка сервера' 
            });
        }
        
        const query = 'SELECT id, username, email FROM users WHERE id = ?';
        
        connection.query(query, [userId], (queryErr, results) => {
            connection.release();
            
            if (queryErr) {
                console.error('Ошибка запроса:', queryErr);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Ошибка сервера' 
                });
            }
            
            if (results.length === 0) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Пользователь не найден' 
                });
            }
            
            res.json({ 
                success: true, 
                user: results[0] 
            });
        });
    });
});

// Главная страница
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Все остальные GET запросы
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Обработка ошибок 404 для API
app.use('/api/*', (req, res) => {
    res.status(404).json({ 
        success: false, 
        message: 'API endpoint не найден' 
    });
});

// Глобальный обработчик ошибок
app.use((err, req, res, next) => {
    console.error('Глобальная ошибка:', err);
    res.status(500).json({ 
        success: false, 
        message: 'Внутренняя ошибка сервера' 
    });
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`🌐 Доступен по адресу: http://localhost:${PORT}`);
    console.log(`🔧 Проверка здоровья: http://localhost:${PORT}/api/health`);
});