const express = require('express');
const { Pool } = require('pg');  // Добавь эту строку!
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// ============ ПОДКЛЮЧЕНИЕ К POSTGRESQL ============
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false  // Обязательно для Render!
    }
});

// Проверка подключения к БД
pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ Ошибка подключения к PostgreSQL:', err.message);
    } else {
        console.log('✅ Подключение к PostgreSQL успешно!');
        release();
        
        // Создаем таблицу если её нет
        createUsersTable();
    }
});

// Создание таблицы
async function createUsersTable() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(100) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Таблица users готова');
    } catch (err) {
        console.error('❌ Ошибка создания таблицы:', err.message);
    }
}

// ============ API МАРШРУТЫ ============

// 1. Проверка сервера и БД
app.get('/api/health', async (req, res) => {
    try {
        // Проверяем подключение к БД
        await pool.query('SELECT 1');
        const usersCount = await pool.query('SELECT COUNT(*) FROM users');
        
        res.json({ 
            status: 'ok', 
            message: 'Сервер и PostgreSQL работают',
            database: 'PostgreSQL on Render',
            usersCount: parseInt(usersCount.rows[0].count),
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        res.status(500).json({ 
            status: 'error', 
            message: 'Ошибка подключения к БД',
            error: err.message 
        });
    }
});

// 2. Регистрация (сохраняет в PostgreSQL)
app.post('/api/register', async (req, res) => {
    console.log('📝 Получен запрос на регистрацию:', req.body);
    
    try {
        const { username, email, password } = req.body;
        
        // Проверка
        if (!username || !email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Заполните все поля' 
            });
        }
        
        // Проверка email
        if (!email.includes('@') || !email.includes('.')) {
            return res.status(400).json({ 
                success: false, 
                message: 'Некорректный email' 
            });
        }
        
        // Сохраняем в PostgreSQL
        const result = await pool.query(
            'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id',
            [username, email, password]
        );
        
        console.log('✅ Пользователь сохранен в PostgreSQL, ID:', result.rows[0].id);
        
        res.json({ 
            success: true, 
            message: 'Регистрация успешна!',
            userId: result.rows[0].id
        });
        
    } catch (error) {
        console.error('❌ Ошибка регистрации:', error.message);
        
        // Ошибка дубликата email
        if (error.code === '23505') {
            return res.status(400).json({ 
                success: false, 
                message: 'Email уже занят' 
            });
        }
        
        res.status(500).json({ 
            success: false, 
            message: 'Ошибка сервера: ' + error.message 
        });
    }
});

// 3. Вход (проверяет в PostgreSQL)
app.post('/api/login', async (req, res) => {
    console.log('🔐 Попытка входа:', req.body.email);
    
    try {
        const { email, password } = req.body;
        
        // Ищем в PostgreSQL
        const result = await pool.query(
            'SELECT id, username, email FROM users WHERE email = $1 AND password = $2',
            [email, password]
        );
        
        if (result.rows.length > 0) {
            console.log('✅ Успешный вход:', email);
            
            res.json({ 
                success: true, 
                message: 'Вход выполнен',
                user: result.rows[0]
            });
        } else {
            res.status(401).json({ 
                success: false, 
                message: 'Неверный email или пароль' 
            });
        }
    } catch (error) {
        console.error('❌ Ошибка входа:', error.message);
        res.status(500).json({ 
            success: false, 
            message: 'Ошибка сервера' 
        });
    }
});

// 4. Получить всех пользователей из PostgreSQL
app.get('/api/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, username, email, created_at FROM users ORDER BY created_at DESC');
        
        res.json({ 
            success: true, 
            users: result.rows 
        });
    } catch (error) {
        console.error('❌ Ошибка получения пользователей:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Ошибка сервера' 
        });
    }
});

// ============ СТАТИЧЕСКИЕ ФАЙЛЫ ============

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.all('/api/*', (req, res) => {
    res.status(404).json({ 
        success: false, 
        message: 'API endpoint не найден' 
    });
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ============ ЗАПУСК СЕРВЕРА ============

app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`🔗 PostgreSQL подключен: ${process.env.DATABASE_URL ? 'Да' : 'Нет'}`);
});