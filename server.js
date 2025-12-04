const express = require('express'); 
const mysql = require('mysql2'); 
const cors = require('cors'); 
const path = require('path');
const bodyParser = require('body-parser'); // Добавил, так как было в зависимостях

const app = express();
// ВАЖНО: Порт должен быть динамическим для Render
const PORT = process.env.PORT || 3000;

app.use(cors()); 
app.use(express.json()); 
app.use(bodyParser.json());
// Раздаем файлы из ТЕКУЩЕЙ папки (у тебя index.html лежит рядом с server.js)
app.use(express.static(__dirname));

// --- ОТЛИЧИЕ 1: Подключение ---
// В примере было жестко прописано localhost. 
// Тут мы берем данные из Render (Environment Variables)
const connection = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '', // Если локально без пароля
    database: process.env.DB_NAME || 'kitchen_shop',
    port: process.env.DB_PORT || 3306
});

// Пинг базы (чтобы Railway не разрывал соединение)
setInterval(() => {
    connection.query('SELECT 1');
}, 5000);

function initializeDatabase() {
    connection.connect((err) => {
        if (err) {
            console.log('Ошибка подключения к MySQL:', err.message);
            return;
        }
        console.log('Подключение к MySQL серверу успешно!');

        // Мы просто используем уже созданную базу (на Railway она создается автоматически)
        createTables();
    });
}

function createTables() {
    // Таблица пользователей
    const createUsersTable = `
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(100) NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;
    
    // Таблица заказов
    const createOrdersTable = `
        CREATE TABLE IF NOT EXISTS orders (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NULL,
            customer_name VARCHAR(100) NOT NULL,
            customer_phone VARCHAR(20) NOT NULL,
            customer_note TEXT,
            product_name VARCHAR(100) NOT NULL,
            product_price DECIMAL(10,2) NOT NULL,
            quantity INT NOT NULL DEFAULT 1,
            total_amount DECIMAL(10,2) NOT NULL,
            status ENUM('pending', 'confirmed', 'completed') DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;

    connection.query(createUsersTable, (err) => {
        if (err) console.log('Ошибка таблицы users:', err.message);
        else console.log('Таблица users проверена');
    });

    connection.query(createOrdersTable, (err) => {
        if (err) console.log('Ошибка таблицы orders:', err.message);
        else console.log('Таблица orders проверена');
    });
}

// --- API ---

// Регистрация
app.post('/register', (req, res) => { 
    // В примере было name, у тебя в script.js - username
    const { username, email, password } = req.body; 

    if (!email || !email.includes('@')) { 
        return res.status(400).json({ success: false, message: 'Некорректный email!' });
    }

    const checkUser = "SELECT * FROM users WHERE email = ?";
    connection.query(checkUser, [email], (err, results) => {
        if (err) return res.status(500).json({ success: false, message: 'Ошибка сервера' });

        if (results.length > 0) {
            return res.status(400).json({ success: false, message: 'Email занят!' });
        }

        const insertUser = "INSERT INTO users (username, email, password) VALUES (?, ?, ?)";
        connection.query(insertUser, [username, email, password], (err, results) => {
            if (err) return res.status(500).json({ success: false, message: 'Ошибка регистрации' });

            res.json({
                success: true,
                message: 'Регистрация успешна!',
                user: { id: results.insertId, name: username }
            });
        });
    });
});

// Вход
app.post('/login', (req, res) => { 
    const { email, password } = req.body;

    const findUser = "SELECT * FROM users WHERE email = ? AND password = ?";
    connection.query(findUser, [email, password], (err, results) => {
        if (err) return res.status(500).json({ success: false, message: 'Ошибка сервера' });

        if (results.length === 0) {
            return res.status(401).json({ success: false, message: 'Неверный email или пароль!' });
        }

        const user = results[0];
        res.json({
            success: true,
            message: 'Вход выполнен успешно!',
            user: { id: user.id, username: user.username, email: user.email }
        });
    });
});

// Главная страница
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Запуск
initializeDatabase();

app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});