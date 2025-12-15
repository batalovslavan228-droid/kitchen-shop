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

// Хранилище пользователей (в памяти)
let users = [];

// ============ API МАРШРУТЫ ============

// 1. Проверка сервера
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        message: 'Сервер работает',
        usersCount: users.length,
        timestamp: new Date().toISOString()
    });
});

// 2. Регистрация
app.post('/api/register', (req, res) => {
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
        
        // Проверяем есть ли такой email
        const existingUser = users.find(user => user.email === email);
        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email уже занят' 
            });
        }
        
        // Создаем пользователя
        const newUser = {
            id: Date.now(),
            username,
            email,
            password,
            created_at: new Date().toISOString()
        };
        
        users.push(newUser);
        
        console.log('✅ Пользователь зарегистрирован:', newUser.id);
        
        res.json({ 
            success: true, 
            message: 'Регистрация успешна!',
            userId: newUser.id
        });
        
    } catch (error) {
        console.error('❌ Ошибка регистрации:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Ошибка сервера' 
        });
    }
});

// 3. Вход
app.post('/api/login', (req, res) => {
    console.log('🔐 Попытка входа:', req.body.email);
    
    try {
        const { email, password } = req.body;
        
        const user = users.find(u => u.email === email && u.password === password);
        
        if (user) {
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
            message: 'Ошибка сервера' 
        });
    }
});

// 4. Получить всех пользователей
app.get('/api/users', (req, res) => {
    // Не показываем пароли
    const usersWithoutPasswords = users.map(u => ({
        id: u.id,
        username: u.username,
        email: u.email,
        created_at: u.created_at
    }));
    
    res.json({ 
        success: true, 
        users: usersWithoutPasswords 
    });
});

// ============ СТАТИЧЕСКИЕ ФАЙЛЫ ============

// Главная страница
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Для всех остальных маршрутов - 404 для API
app.all('/api/*', (req, res) => {
    res.status(404).json({ 
        success: false, 
        message: 'API endpoint не найден',
        requestedUrl: req.originalUrl
    });
});

// Для остальных - index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ============ ЗАПУСК СЕРВЕРА ============

app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🔗 Register API: http://localhost:${PORT}/api/register`);
    console.log(`🔗 Login API: http://localhost:${PORT}/api/login`);
});