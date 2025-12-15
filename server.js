const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // Раздаем файлы из корня

// Переменная для хранения пользователей (вместо БД)
let users = [];

// Регистрация
app.post('/api/register', (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        console.log('📝 Регистрация:', username, email);
        
        if (!username || !email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Заполните все поля' 
            });
        }
        
        // Проверяем, есть ли такой email
        const existingUser = users.find(user => user.email === email);
        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email уже занят' 
            });
        }
        
        // Создаем нового пользователя
        const newUser = {
            id: Date.now(), // ID из времени
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

// Вход
app.post('/api/login', (req, res) => {
    try {
        const { email, password } = req.body;
        
        console.log('🔐 Вход:', email);
        
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
            message: 'Ошибка сервера' 
        });
    }
});

// Проверка здоровья сервера
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        message: 'Сервер работает',
        usersCount: users.length,
        timestamp: new Date().toISOString()
    });
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

// Главная страница
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`🌐 Ссылка: http://localhost:${PORT}`);
    console.log(`🔧 Health check: http://localhost:${PORT}/api/health`);
    console.log(`👥 Users API: http://localhost:${PORT}/api/users`);
});