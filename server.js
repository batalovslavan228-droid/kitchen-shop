const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// Хранилище пользователей в памяти
let users = [];

// ================= API МАРШРУТЫ =================

// Проверка работы сервера
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        message: 'Сервер работает',
        usersCount: users.length,
        timestamp: new Date().toISOString()
    });
});

// Регистрация
app.post('/api/register', (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        console.log('📝 Регистрация запроса:', { username, email });
        
        // Проверка обязательных полей
        if (!username || !email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Заполните все поля' 
            });
        }
        
        // Проверка email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Некорректный email' 
            });
        }
        
        // Проверяем, есть ли уже такой email
        const existingUser = users.find(user => user.email === email);
        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                message: 'Этот email уже зарегистрирован' 
            });
        }
        
        // Создаем нового пользователя
        const newUser = {
            id: Date.now(), // Простой ID на основе времени
            username,
            email,
            password,
            created_at: new Date().toISOString()
        };
        
        // Добавляем в массив
        users.push(newUser);
        
        console.log('✅ Пользователь зарегистрирован:', newUser.id);
        
        // Успешный ответ
        res.json({ 
            success: true, 
            message: 'Регистрация успешна!',
            userId: newUser.id
        });
        
    } catch (error) {
        console.error('❌ Ошибка регистрации:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Внутренняя ошибка сервера' 
        });
    }
});

// Вход
app.post('/api/login', (req, res) => {
    try {
        const { email, password } = req.body;
        
        console.log('🔐 Попытка входа:', email);
        
        // Ищем пользователя
        const user = users.find(u => u.email === email && u.password === password);
        
        if (user) {
            console.log('✅ Успешный вход:', email);
            
            // Убираем пароль из ответа
            const { password: _, ...userWithoutPassword } = user;
            
            res.json({ 
                success: true, 
                message: 'Вход выполнен',
                user: userWithoutPassword
            });
        } else {
            res.status(401).json({ 
                success: false, 
                message: 'Неверный email или пароль' 
            });
        }
        
    } catch (error) {
        console.error('❌ Ошибка входа:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Внутренняя ошибка сервера' 
        });
    }
});

// Получить всех пользователей (для отладки)
app.get('/api/users', (req, res) => {
    res.json({ 
        success: true, 
        users: users.map(u => ({ 
            id: u.id, 
            username: u.username, 
            email: u.email 
        }))
    });
});

// ================= СТАТИЧЕСКИЕ ФАЙЛЫ =================

// Главная страница
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Для всех остальных маршрутов - 404 для API, index.html для остального
app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
        res.status(404).json({ 
            success: false, 
            message: 'API endpoint не найден' 
        });
    } else {
        res.sendFile(path.join(__dirname, 'index.html'));
    }
});

// ================= ЗАПУСК СЕРВЕРА =================

app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`🌐 Доступен по адресу: http://localhost:${PORT}`);
    console.log(`🔧 Проверка здоровья: http://localhost:${PORT}/api/health`);
    console.log(`📝 Регистрация API: http://localhost:${PORT}/api/register`);
    console.log(`🔐 Вход API: http://localhost:${PORT}/api/login`);
});