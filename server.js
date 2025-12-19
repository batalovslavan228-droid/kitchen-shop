const express = require('express');
const { Pool } = require('pg');
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
        rejectUnauthorized: false
    }
});

// Проверка подключения к БД
pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ Ошибка подключения к PostgreSQL:', err.message);
    } else {
        console.log('✅ Подключение к PostgreSQL успешно!');
        release();
        
        // Создаем таблицы при старте
        createTables();
    }
});

// Создание таблиц (Пользователи и Заказы)
async function createTables() {
    try {
        // 1. Таблица Пользователей
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

        // 2. Таблица Заказов (Товаров/Покупок) - Имя, Телефон, Адрес
        await pool.query(`
            CREATE TABLE IF NOT EXISTS orders (
                id SERIAL PRIMARY KEY,
                customer_name VARCHAR(100) NOT NULL,
                phone_number VARCHAR(50) NOT NULL,
                address TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Таблица orders готова');

    } catch (err) {
        console.error('❌ Ошибка создания таблиц:', err.message);
    }
}

// ============ API МАРШРУТЫ ============

// 1. Проверка сервера и БД
app.get('/api/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        const usersCount = await pool.query('SELECT COUNT(*) FROM users');
        const ordersCount = await pool.query('SELECT COUNT(*) FROM orders');
        
        res.json({ 
            status: 'ok', 
            message: 'Сервер работает',
            stats: {
                users: parseInt(usersCount.rows[0].count),
                orders: parseInt(ordersCount.rows[0].count)
            }
        });
    } catch (err) {
        res.status(500).json({ status: 'error', message: 'Ошибка БД', error: err.message });
    }
});

// 2. Регистрация
app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        if (!username || !email || !password) {
            return res.status(400).json({ success: false, message: 'Заполните все поля' });
        }
        
        const result = await pool.query(
            'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id',
            [username, email, password]
        );
        
        res.json({ success: true, message: 'Регистрация успешна!', userId: result.rows[0].id });
        
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({ success: false, message: 'Email уже занят' });
        }
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

// 3. Вход
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const result = await pool.query(
            'SELECT id, username, email FROM users WHERE email = $1 AND password = $2',
            [email, password]
        );
        
        if (result.rows.length > 0) {
            res.json({ success: true, message: 'Вход выполнен', user: result.rows[0] });
        } else {
            res.status(401).json({ success: false, message: 'Неверный email или пароль' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

// 4. ОФОРМЛЕНИЕ ЗАКАЗА (Новый маршрут)
app.post('/api/checkout', async (req, res) => {
    console.log('📦 Новый заказ:', req.body);

    try {
        const { name, phone, address } = req.body;

        // Простая валидация
        if (!name || !phone || !address) {
            return res.status(400).json({ 
                success: false, 
                message: 'Заполните Имя, Телефон и Адрес' 
            });
        }

        // Сохраняем в таблицу orders
        const result = await pool.query(
            'INSERT INTO orders (customer_name, phone_number, address) VALUES ($1, $2, $3) RETURNING id',
            [name, phone, address]
        );

        console.log('✅ Заказ сохранен, ID:', result.rows[0].id);

        res.json({ 
            success: true, 
            message: 'Заказ успешно сохранен в БД',
            orderId: result.rows[0].id
        });

    } catch (error) {
        console.error('❌ Ошибка сохранения заказа:', error);
        res.status(500).json({ success: false, message: 'Ошибка при сохранении заказа' });
    }
});

// 5. (Опционально) Получить все заказы (для админки)
app.get('/api/orders', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
        res.json({ success: true, orders: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Ошибка получения заказов' });
    }
});


// ============ СТАТИЧЕСКИЕ ФАЙЛЫ ============
app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'index.html')); });
app.all('/api/*', (req, res) => { res.status(404).json({ success: false, message: 'API endpoint не найден' }); });
app.get('*', (req, res) => { res.sendFile(path.join(__dirname, 'index.html')); });

// ============ ЗАПУСК СЕРВЕРА ============
app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
});