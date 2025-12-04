const express = require('express'); // для создания сервера
const mysql = require('mysql2'); // для работы с базой данных MySQL
const cors = require('cors'); // чтобы фронтенд мог общаться с сервером
const path = require('path'); // для работы с путями к файлам

// Создаем экземпляр приложения Express
const app = express();

// ВАЖНО: Порт берем из окружения (для Render/Railway) или 3000 для локалки
const PORT = process.env.PORT || 3000;

app.use(cors()); // разрешаю запросы с любого домена
app.use(express.json()); // сервер понимает JSON данные
// ВАЖНО: Раздаем статические файлы (HTML, CSS, JS) из текущей папки
app.use(express.static(__dirname));

// Подключение к MySQL (Railway/Render)
// Используем переменные окружения или локальные настройки по умолчанию
const connection = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password', // Твой локальный пароль
    database: process.env.DB_NAME || 'kitchen_shop',
    port: process.env.DB_PORT || 3306
});

// Пинг базы данных каждые 5 секунд, чтобы соединение не разрывалось (важно для облака)
setInterval(() => {
    connection.query('SELECT 1');
}, 5000);

// Функция для инициализации базы данных
function initializeDatabase() {
    connection.connect((err) => {
        if (err) {
            console.log('Ошибка подключения к MySQL:', err.message);
            return;
        }
        console.log('Подключение к MySQL серверу успешно!');

        // Так как на Railway база уже создана, мы просто выбираем её
        // Но оставим проверку для локального запуска
        const dbName = process.env.DB_NAME || 'kitchen_shop';
        
        connection.query(`CREATE DATABASE IF NOT EXISTS ${dbName}`, (err) => {
            if (err) {
                console.log('Ошибка создания БД (возможно, она уже есть):', err.message);
                // Не останавливаемся, идем дальше
            }
            console.log(`База данных ${dbName} готова к работе`);

            // Переключаемся на базу данных
            connection.query(`USE ${dbName}`, (err) => {
                if (err) {
                    console.log('Ошибка выбора БД:', err.message);
                    return;
                }
                console.log(`Используем базу данных ${dbName}`);

                // Создаем таблицы
                createTables();
            });
        });
    });
}

function createTables() {
    // Таблица 1: Пользователи (для авторизации)
    const createUsersTable = `
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(100) NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;
    
    // Таблица 2: Заказы (включает в себя информацию о товарах)
    const createOrdersTable = `
        CREATE TABLE IF NOT EXISTS orders (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NULL,
            customer_name VARCHAR(100) NOT NULL,
            customer_phone VARCHAR(20) NOT NULL,
            customer_address TEXT,
            product_name VARCHAR(100) NOT NULL,
            product_price DECIMAL(10,2) NOT NULL,
            quantity INT NOT NULL DEFAULT 1,
            total_amount DECIMAL(10,2) NOT NULL,
            status ENUM('pending', 'confirmed', 'completed') DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;

    connection.query(createUsersTable, (err) => {
        if (err) console.log('Ошибка создания таблицы users:', err.message);
        else console.log('Таблица users создана/уже существует');
    });

    connection.query(createOrdersTable, (err) => {
        if (err) console.log('Ошибка создания таблицы orders:', err.message);
        else console.log('Таблица orders создана/уже существует');
    });
}

// --- API МАРШРУТЫ ---

// Главная страница
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Регистрация
app.post('/register', (req, res) => { // Обработка регистрации
    // В твоем скрипте используются поля username, email, password
    const { username, email, password } = req.body;

    if (!email || !email.includes('@')) {
        return res.status(400).json({ success: false, message: 'Пожалуйста, введите корректный email!' });
    }

    // Проверка существования пользователя
    const checkUser = "SELECT * FROM users WHERE email = ?";
    connection.query(checkUser, [email], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: 'Ошибка сервера' });
        }

        if (results.length > 0) {
            return res.status(400).json({ success: false, message: 'Пользователь с таким email уже существует!' });
        }

        const insertUser = "INSERT INTO users (username, email, password) VALUES (?, ?, ?)";
        connection.query(insertUser, [username, email, password], (err, results) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ success: false, message: 'Ошибка при регистрации' });
            }

            res.json({
                success: true,
                message: 'Регистрация успешна!',
                user: { id: results.insertId, username: username }
            });
        });
    });
});

// Вход
app.post('/login', (req, res) => { // Обработка входа
    const { email, password } = req.body;

    const findUser = "SELECT * FROM users WHERE email = ?";
    connection.query(findUser, [email], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: 'Ошибка сервера' });
        }

        if (results.length === 0) {
            return res.status(401).json({ success: false, message: 'Пользователь не найден!' });
        }

        const user = results[0];
        
        // Простая проверка пароля (как в твоем примере, без хеширования)
        if (user.password === password) {
            res.json({
                success: true,
                message: 'Вход выполнен успешно!',
                user: { id: user.id, username: user.username, email: user.email }
            });
        } else {
            res.status(401).json({ success: false, message: 'Неверный пароль!' });
        }
    });
});

// Сохранение заказа (Опционально, если будешь использовать в будущем)
app.post('/api/orders', (req, res) => {
    const { user_id, customer_name, customer_phone, customer_address, products } = req.body;

    // Простейшая реализация для одного товара или массива
    // В реальном проекте тут сложнее, но для старта хватит
    res.json({
        success: true,
        message: 'Заказ принят (тестовый режим)'
    });
});

// Тестовые endpoints для проверки
app.get('/api/test', (req, res) => {
    res.json({ 
        message: 'Сервер Kitchen Shop работает!', 
        status: 'OK',
        database: 'MySQL'
    });
});

// Проверка подключения к базе данных
app.get('/api/check-db', (req, res) => {
    connection.query('SELECT 1 as test', (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Ошибка БД: ' + err.message });
        }
        res.json({ 
            message: 'MySQL подключен успешно',
            test: results[0].test,
            status: 'OK'
        });
    });
});

// Запуск инициализации и сервера
initializeDatabase();

app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
    console.log(`http://localhost:${PORT}`);
    console.log('Используется MySQL база данных');
});