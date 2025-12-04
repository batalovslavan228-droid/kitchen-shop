document.addEventListener('DOMContentLoaded', () => {

    /* ========================================================================
       1. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ (ВАЛИДАЦИИ)
       ======================================================================== */
    function setError(element, message) {
        const formGroup = element.parentElement;
        const errorDisplay = formGroup.querySelector('.error-message');
        if (errorDisplay) {
            formGroup.classList.add('error');
            formGroup.classList.remove('success');
            errorDisplay.innerText = message;
            errorDisplay.style.display = 'block'; // Показываем ошибку
        }
    }

    function setSuccess(element) {
        const formGroup = element.parentElement;
        const errorDisplay = formGroup.querySelector('.error-message');
        if (errorDisplay) {
            formGroup.classList.add('success');
            formGroup.classList.remove('error');
            errorDisplay.innerText = '';
            errorDisplay.style.display = 'none'; // Скрываем ошибку
        }
    }

    function isValidEmail(email) {
        const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(String(email).toLowerCase());
    }


    /* ========================================================================
       2. РЕГИСТРАЦИЯ (ОТПРАВКА НА СЕРВЕР NODE.JS)
       ======================================================================== */
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const username = document.getElementById('reg-username');
            const email = document.getElementById('reg-email');
            const password = document.getElementById('reg-password');
            const password2 = document.getElementById('reg-password2');
            let isValid = true;

            // Валидация полей
            if(username.value.trim() === '') { setError(username, 'Введите имя'); isValid = false; } else setSuccess(username);
            if(!isValidEmail(email.value.trim())) { setError(email, 'Некорректный email'); isValid = false; } else setSuccess(email);
            if(password.value.trim().length < 6) { setError(password, 'Пароль мин. 6 символов'); isValid = false; } else setSuccess(password);
            if(password2.value.trim() !== password.value.trim()) { setError(password2, 'Пароли не совпадают'); isValid = false; } else setSuccess(password2);

            if (isValid) {
                // Отправляем данные на твой сервер (server.js)
                fetch('/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username: username.value.trim(),
                        email: email.value.trim(),
                        password: password.value.trim()
                    })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        alert('Регистрация успешна! Теперь войдите.');
                        window.location.href = 'login.html';
                    } else {
                        // Если сервер вернул ошибку (например, email занят)
                        alert('Ошибка: ' + data.message);
                    }
                })
                .catch(error => console.error('Error:', error));
            }
        });
    }


    /* ========================================================================
       3. ВХОД (ЗАПРОС К СЕРВЕРУ NODE.JS)
       ======================================================================== */
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        // Если уже вошли — редирект в кабинет
        if (localStorage.getItem('isLoggedIn') === 'true') {
            window.location.href = 'account.html';
        }

        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email');
            const password = document.getElementById('login-password');
            const loginError = document.getElementById('login-error');
            
            setSuccess(email); 
            setSuccess(password);
            if(loginError) loginError.style.display = 'none';

            // Запрос на сервер
            fetch('/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: email.value.trim(),
                    password: password.value.trim()
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Сервер подтвердил вход
                    localStorage.setItem('isLoggedIn', 'true');
                    localStorage.setItem('kitchenShopUserName', data.user.username); // Имя из БД
                    localStorage.setItem('kitchenShopUserEmail', data.user.email);   // Email из БД
                    
                    alert('Вход выполнен!');
                    window.location.href = 'account.html';
                } else {
                    // Ошибка (неверный пароль или юзер не найден)
                    setError(email, '');
                    setError(password, '');
                    if(loginError) {
                        loginError.textContent = data.message;
                        loginError.style.display = 'block';
                    }
                }
            })
            .catch(error => console.error('Error:', error));
        });
    }


    /* ========================================================================
       4. ЛИЧНЫЙ КАБИНЕТ И ШАПКА
       ======================================================================== */
    const accountUsername = document.getElementById('account-username');
    
    // Логика страницы Личного Кабинета
    if (accountUsername) { 
        if (localStorage.getItem('isLoggedIn') !== 'true') {
            window.location.href = 'login.html';
        } else {
            document.getElementById('account-username').textContent = localStorage.getItem('kitchenShopUserName') || 'Пользователь';
            document.getElementById('account-email').textContent = localStorage.getItem('kitchenShopUserEmail') || 'email@example.com';
            
            document.getElementById('logout-button').addEventListener('click', () => {
                localStorage.removeItem('isLoggedIn');
                localStorage.removeItem('kitchenShopUserName');
                localStorage.removeItem('kitchenShopUserEmail');
                window.location.href = 'login.html';
            });
        }
    }

    // Обновление иконки профиля в шапке (если вошел - ведет в кабинет)
    const profileLink = document.getElementById('profile-link');
    if (profileLink && localStorage.getItem('isLoggedIn') === 'true') {
        profileLink.href = 'account.html';
    }


    /* ========================================================================
       5. КОРЗИНА (ДОБАВЛЕНИЕ И ОТОБРАЖЕНИЕ)
       ======================================================================== */

    // --- А. Кнопка "Добавить в корзину" (на странице товара) ---
    const addToCartBtn = document.getElementById('buy-now-btn');
    
    // Проверяем, что мы на странице товара (есть кнопка) и НЕ в самой корзине
    if (addToCartBtn && !document.getElementById('cart-items-container')) {
        addToCartBtn.addEventListener('click', () => {
            const title = document.querySelector('.product-info h1').innerText;
            const price = document.querySelector('.product-info .price').innerText;
            
            // Ищем картинку: сначала пробуем главную из галереи, если нет - обычную
            let imageSrc = '';
            const mainGalImg = document.getElementById('main-product-img');
            if (mainGalImg) {
                imageSrc = mainGalImg.src;
            } else {
                const simpleImg = document.querySelector('.product-image img');
                if(simpleImg) imageSrc = simpleImg.src;
            }

            const product = { name: title, price: price, image: imageSrc };
            
            // Сохраняем в localStorage
            let cart = JSON.parse(localStorage.getItem('shoppingCart')) || [];
            cart.push(product);
            localStorage.setItem('shoppingCart', JSON.stringify(cart));
            
            alert('Товар добавлен в корзину!');
        });
    }

    // --- Б. Логика страницы Корзины (cart.html) ---
    const cartItemsContainer = document.getElementById('cart-items-container');
    
    if (cartItemsContainer) {
        renderCart(); // Рисуем товары при загрузке

        // Кнопка "Очистить корзину"
        const clearBtn = document.getElementById('clear-cart-btn');
        if(clearBtn) {
            clearBtn.addEventListener('click', () => {
                if(confirm('Вы уверены, что хотите очистить корзину?')) {
                    localStorage.removeItem('shoppingCart');
                    renderCart();
                }
            });
        }

        // Модальное окно оформления заказа
        const checkoutBtn = document.getElementById('checkout-btn');
        const modal = document.getElementById('purchase-modal');
        const closeModal = document.getElementById('modal-close-btn');
        const purchaseForm = document.getElementById('purchase-form');

        if (checkoutBtn && modal) {
            checkoutBtn.addEventListener('click', () => {
                const cart = JSON.parse(localStorage.getItem('shoppingCart')) || [];
                if (cart.length === 0) {
                    alert('Корзина пуста!');
                } else {
                    modal.classList.add('active');
                }
            });

            closeModal.addEventListener('click', (e) => {
                e.preventDefault();
                modal.classList.remove('active');
            });

            modal.addEventListener('click', (e) => {
                if(e.target === modal) modal.classList.remove('active');
            });

            // Отправка формы заказа
            if(purchaseForm) {
                purchaseForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    // Тут простая валидация
                    const name = document.getElementById('purchase-name');
                    const phone = document.getElementById('purchase-phone');
                    const address = document.getElementById('purchase-address');
                    
                    if(name.value.trim() !== '' && phone.value.trim() !== '' && address.value.trim() !== '') {
                        alert(`Спасибо, ${name.value}! Ваш заказ успешно оформлен.`);
                        localStorage.removeItem('shoppingCart'); // Очищаем корзину
                        modal.classList.remove('active');
                        purchaseForm.reset();
                        renderCart(); // Перерисовываем пустую корзину
                    } else {
                        alert('Пожалуйста, заполните все поля!');
                    }
                });
            }
        }
    }

    // --- В. Функция отрисовки товаров (Новый Дизайн) ---
    function renderCart() {
        if (!cartItemsContainer) return;

        let cart = JSON.parse(localStorage.getItem('shoppingCart')) || [];
        cartItemsContainer.innerHTML = ''; // Очищаем контейнер
        let total = 0;
        let totalCount = 0;

        const checkoutBtn = document.getElementById('checkout-btn');

        if (cart.length === 0) {
            // Если пусто
            cartItemsContainer.innerHTML = '<div style="text-align:center; padding: 40px;"><i class="fas fa-shopping-basket" style="font-size: 48px; color: #ddd; margin-bottom: 20px;"></i><p style="font-size: 18px;">В корзине пока пусто</p><a href="catalog.html" style="color: #E24C55; text-decoration: none; font-weight: 600;">Перейти к покупкам</a></div>';
            if(checkoutBtn) {
                checkoutBtn.disabled = true;
                checkoutBtn.style.opacity = '0.5';
                checkoutBtn.style.cursor = 'not-allowed';
            }
        } else {
            // Если есть товары
            if(checkoutBtn) {
                checkoutBtn.disabled = false;
                checkoutBtn.style.opacity = '1';
                checkoutBtn.style.cursor = 'pointer';
            }

            cart.forEach((item, index) => {
                // Чистим цену от "руб." и пробелов
                let priceNumber = parseInt(item.price.replace(/\D/g, '')); 
                // Генерируем "старую цену" для красоты (+30%)
                let oldPriceNumber = Math.round(priceNumber * 1.3);
                
                total += priceNumber;
                totalCount++;

                const itemDiv = document.createElement('div');
                itemDiv.classList.add('cart-item');
                
                // HTML структура карточки в корзине
                itemDiv.innerHTML = `
                    <div class="cart-checkbox">
                        <i class="fas fa-check-square" style="color: #E24C55;"></i>
                    </div>

                    <div class="cart-img-wrapper">
                        <img src="${item.image}" alt="${item.name}">
                    </div>

                    <div class="cart-item-info">
                        <h3>${item.name}</h3>
                        <a href="#" class="accessories-link">Показать все аксессуары &gt;</a>
                    </div>

                    <div class="cart-controls">
                        <div class="quantity-control">
                            <button class="quantity-btn" disabled>-</button>
                            <div class="quantity-value">1</div>
                            <button class="quantity-btn" disabled>+</button>
                        </div>
                        <div class="cart-actions-links">
                            <span class="action-link" onclick="removeItem(${index})">Удалить</span>
                            <span class="action-link">В избранное</span>
                        </div>
                    </div>

                    <div class="cart-price-block">
                        <span class="price-current">${priceNumber.toLocaleString()} ₽</span>
                        <span class="price-old">${oldPriceNumber.toLocaleString()} ₽</span>
                    </div>
                `;
                cartItemsContainer.appendChild(itemDiv);
            });
        }

        // Обновляем итоги справа
        const countEl = document.getElementById('cart-count');
        const totalEl = document.getElementById('cart-total-price');
        if(countEl) countEl.innerText = totalCount + ' шт.';
        if(totalEl) totalEl.innerText = total.toLocaleString() + ' руб.';
    }

    // Глобальная функция удаления (чтобы работала из onclick в HTML)
    window.removeItem = function(index) {
        let cart = JSON.parse(localStorage.getItem('shoppingCart')) || [];
        cart.splice(index, 1); // Удаляем элемент по индексу
        localStorage.setItem('shoppingCart', JSON.stringify(cart));
        renderCart(); // Перерисовываем
    };


    /* ========================================================================
       6. ГАЛЕРЕЯ ИЗОБРАЖЕНИЙ (СТРАНИЦЫ ТОВАРОВ)
       ======================================================================== */
    const mainImage = document.getElementById('main-product-img');
    const thumbs = document.querySelectorAll('.gallery-thumb');
    const arrowPrev = document.querySelector('.gallery-arrow.prev');
    const arrowNext = document.querySelector('.gallery-arrow.next');

    if (mainImage && thumbs.length > 0) {
        let currentIndex = 0;

        function updateGallery(index) {
            // Снимаем класс active со всех
            thumbs.forEach(t => t.classList.remove('active'));
            // Ставим активной текущей
            thumbs[index].classList.add('active');
            
            // Меняем картинку
            const newSrc = thumbs[index].getAttribute('src');
            mainImage.style.opacity = 0; // Эффект мигания
            setTimeout(() => {
                mainImage.src = newSrc;
                mainImage.style.opacity = 1;
            }, 200);
            
            currentIndex = index;
        }

        // Клик по миниатюрам
        thumbs.forEach((thumb, index) => {
            thumb.addEventListener('click', () => updateGallery(index));
        });

        // Стрелки
        if (arrowPrev && arrowNext) {
            arrowPrev.addEventListener('click', () => {
                let newIndex = currentIndex - 1;
                if (newIndex < 0) newIndex = thumbs.length - 1; // Зацикливание
                updateGallery(newIndex);
            });
            arrowNext.addEventListener('click', () => {
                let newIndex = currentIndex + 1;
                if (newIndex >= thumbs.length) newIndex = 0; // Зацикливание
                updateGallery(newIndex);
            });
        }
    }


    /* ========================================================================
       7. API ЯНДЕКС КАРТЫ
       ======================================================================== */
    const mapEl = document.getElementById('map');
    // Проверяем наличие элемента карты и загружен ли скрипт Яндекса
    if (mapEl && typeof ymaps !== 'undefined') {
        ymaps.ready(() => {
            const center = [55.7758, 37.6852];
            const map = new ymaps.Map("map", { center: center, zoom: 16 });
            map.geoObjects.add(new ymaps.Placemark(center, {
                hintContent: 'Магазин "КухняТех"',
                balloonContent: 'Мы здесь!'
            }, { preset: 'islands#redDotIcon' }));
            
            map.controls.remove('searchControl');
            map.controls.remove('trafficControl');
        });
    }

}); // Конец DOMContentLoaded