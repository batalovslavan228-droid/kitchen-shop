document.addEventListener('DOMContentLoaded', () => {

    /* ========================================================================
       0. СИСТЕМА УВЕДОМЛЕНИЙ (ВМЕСТО ALERT)
       ======================================================================== */
    let notifyContainer = document.getElementById('notification-container');
    if (!notifyContainer) {
        notifyContainer = document.createElement('div');
        notifyContainer.id = 'notification-container';
        document.body.appendChild(notifyContainer);
    }

    function showNotify(message, type = 'info') {
        const notify = document.createElement('div');
        notify.classList.add('notification', type);
        notify.innerText = message;
        notifyContainer.appendChild(notify);
        setTimeout(() => {
            notify.style.animation = 'fadeOut 0.3s forwards';
            notify.addEventListener('animationend', () => notify.remove());
        }, 3000);
    }

    /* ========================================================================
       0.1. VISUAL AUTH CHECK (Иконка профиля)
       ======================================================================== */
    function updateProfileIcon() {
        const profileLink = document.getElementById('profile-link');
        if (!profileLink) return;
        
        const icon = profileLink.querySelector('i');
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';

        if (isLoggedIn) {
            // Если вошли: иконка с галочкой
            icon.className = 'fas fa-user-check';
            icon.style.color = '#4CAF50'; // Зеленый цвет для наглядности
            profileLink.title = "Вы авторизованы";
        } else {
            // Если нет: обычная иконка
            icon.className = 'far fa-user';
            icon.style.color = ''; 
            profileLink.title = "Войти";
        }
    }
    // Запускаем сразу при загрузке
    updateProfileIcon();


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
            errorDisplay.style.display = 'block';
        }
    }

    function setSuccess(element) {
        const formGroup = element.parentElement;
        const errorDisplay = formGroup.querySelector('.error-message');
        if (errorDisplay) {
            formGroup.classList.add('success');
            formGroup.classList.remove('error');
            errorDisplay.innerText = '';
            errorDisplay.style.display = 'none';
        }
    }

    function isValidEmail(email) {
        const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(String(email).toLowerCase());
    }

    function isValidPhone(phone) {
        const re = /^[\d\+\-\(\)\s]+$/;
        const digits = phone.replace(/\D/g, ''); 
        return re.test(phone) && digits.length >= 10 && digits.length <= 15;
    }


    /* ========================================================================
       2. РЕГИСТРАЦИЯ
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

            if(username.value.trim() === '') { setError(username, 'Введите имя'); isValid = false; } else setSuccess(username);
            if(!isValidEmail(email.value.trim())) { setError(email, 'Некорректный email'); isValid = false; } else setSuccess(email);
            if(password.value.trim().length < 6) { setError(password, 'Пароль мин. 6 символов'); isValid = false; } else setSuccess(password);
            if(password2.value.trim() !== password.value.trim()) { setError(password2, 'Пароли не совпадают'); isValid = false; } else setSuccess(password2);

            if (isValid) {
                fetch('/api/register', {
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
                        showNotify('Регистрация успешна! Теперь войдите.', 'success');
                        setTimeout(() => window.location.href = 'login.html', 1500);
                    } else {
                        showNotify('Ошибка: ' + data.message, 'error');
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    showNotify('Ошибка соединения с сервером', 'error');
                });
            }
        });
    }


    /* ========================================================================
       3. ВХОД
       ======================================================================== */
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
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

            fetch('/api/login', {
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
                    localStorage.setItem('isLoggedIn', 'true');
                    localStorage.setItem('kitchenShopUserId', data.user.id); // Важно: ID!
                    localStorage.setItem('kitchenShopUserName', data.user.username);
                    localStorage.setItem('kitchenShopUserEmail', data.user.email);
                    
                    updateProfileIcon(); // Обновляем иконку
                    showNotify('Вход выполнен успешно!', 'success');
                    setTimeout(() => window.location.href = 'account.html', 1000);
                } else {
                    setError(email, '');
                    setError(password, '');
                    if(loginError) {
                        loginError.textContent = data.message;
                        loginError.style.display = 'block';
                    }
                    showNotify(data.message, 'error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showNotify('Ошибка сервера', 'error');
            });
        });
    }


    /* ========================================================================
       4. ЛИЧНЫЙ КАБИНЕТ И ШАПКА
       ======================================================================== */
    const accountUsername = document.getElementById('account-username');
    
    if (accountUsername) { 
        if (localStorage.getItem('isLoggedIn') !== 'true') {
            window.location.href = 'login.html';
        } else {
            document.getElementById('account-username').textContent = localStorage.getItem('kitchenShopUserName') || 'Пользователь';
            document.getElementById('account-email').textContent = localStorage.getItem('kitchenShopUserEmail') || 'email@example.com';
            
            document.getElementById('logout-button').addEventListener('click', () => {
                localStorage.removeItem('isLoggedIn');
                localStorage.removeItem('kitchenShopUserId');
                localStorage.removeItem('kitchenShopUserName');
                localStorage.removeItem('kitchenShopUserEmail');
                
                updateProfileIcon(); // Возвращаем обычную иконку
                showNotify('Вы вышли из аккаунта', 'info');
                setTimeout(() => window.location.href = 'login.html', 1000);
            });
        }
    }

    const profileLink = document.getElementById('profile-link');
    if (profileLink && localStorage.getItem('isLoggedIn') === 'true') {
        profileLink.href = 'account.html';
    }


    /* ========================================================================
       5. КОРЗИНА
       ======================================================================== */
    
    // А. Добавление в корзину
    const addToCartBtn = document.getElementById('buy-now-btn');
    if (addToCartBtn) {
        addToCartBtn.addEventListener('click', () => {
            const title = document.querySelector('.product-info h1').innerText;
            const price = document.querySelector('.product-info .price').innerText;
            
            let imageSrc = '';
            const mainGalImg = document.getElementById('main-product-img');
            if (mainGalImg) imageSrc = mainGalImg.src;
            else {
                const simpleImg = document.querySelector('.product-image img');
                if(simpleImg) imageSrc = simpleImg.src;
            }

            let cart = JSON.parse(localStorage.getItem('shoppingCart')) || [];
            let existingProduct = cart.find(item => item.name === title);

            if (existingProduct) {
                existingProduct.quantity = (existingProduct.quantity || 1) + 1;
            } else {
                cart.push({ name: title, price: price, image: imageSrc, quantity: 1 });
            }
            
            localStorage.setItem('shoppingCart', JSON.stringify(cart));
            showNotify('Товар добавлен в корзину', 'success');
            updateCartCount();
        });
    }

    // Б. Страница Корзины
    const cartItemsContainer = document.getElementById('cart-items-container');
    if (cartItemsContainer) {
        renderCart(); 

        const clearBtn = document.getElementById('clear-cart-btn');
        if(clearBtn) {
            clearBtn.addEventListener('click', () => {
                if(confirm('Вы уверены, что хотите очистить корзину?')) {
                    localStorage.removeItem('shoppingCart');
                    renderCart();
                    showNotify('Корзина очищена', 'info');
                }
            });
        }

        const checkoutBtn = document.getElementById('checkout-btn');
        const modal = document.getElementById('purchase-modal');
        const closeModal = document.getElementById('modal-close-btn');
        const purchaseForm = document.getElementById('purchase-form');

        if (checkoutBtn && modal) {
            checkoutBtn.addEventListener('click', () => {
                
                // === 1. ПРОВЕРКА ПО ИКОНКЕ (VISUAL CHECK) ===
                const profileIcon = document.querySelector('#profile-link i');
                
                // Если у иконки НЕТ класса с галочкой - значит не авторизован
                if (!profileIcon || !profileIcon.classList.contains('fa-user-check')) {
                    showNotify('Войдите в аккаунт для оформления заказа!', 'error');
                    setTimeout(() => window.location.href = 'login.html', 1500);
                    return; 
                }

                // 2. Проверка пустоты корзины
                const cart = JSON.parse(localStorage.getItem('shoppingCart')) || [];
                if (cart.length === 0) {
                    showNotify('Корзина пуста!', 'error');
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

            // Отправка заказа
            if(purchaseForm) {
                purchaseForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    
                    const name = document.getElementById('purchase-name').value;
                    const phone = document.getElementById('purchase-phone').value;
                    const address = document.getElementById('purchase-address').value;
                    const userId = localStorage.getItem('kitchenShopUserId'); // Получаем ID

                    // Валидация
                    if (name.trim() === '') {
                        showNotify('Введите ваше имя', 'error'); return;
                    }
                    if (!isValidPhone(phone)) {
                        showNotify('Некорректный телефон (мин. 10 цифр)', 'error'); return;
                    }
                    if (address.trim() === '') {
                        showNotify('Введите адрес доставки', 'error'); return;
                    }
                        
                    try {
                        const response = await fetch('/api/checkout', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ name, phone, address, userId })
                        });
                        
                        const data = await response.json();

                        if (data.success) {
                            showNotify(`Заказ №${data.orderId} успешно оформлен!`, 'success');
                            localStorage.removeItem('shoppingCart'); 
                            modal.classList.remove('active');
                            purchaseForm.reset();
                            renderCart();
                        } else {
                            showNotify('Ошибка сервера: ' + data.message, 'error');
                        }
                    } catch (err) {
                        console.error(err);
                        showNotify('Ошибка соединения с сервером', 'error');
                    }
                });
            }
        }
    }

    // В. Отрисовка
    function renderCart() {
        if (!cartItemsContainer) return;

        let cart = JSON.parse(localStorage.getItem('shoppingCart')) || [];
        cartItemsContainer.innerHTML = '';
        let total = 0;
        let totalCount = 0;

        const checkoutBtn = document.getElementById('checkout-btn');

        if (cart.length === 0) {
            cartItemsContainer.innerHTML = '<div style="text-align:center; padding: 40px;"><i class="fas fa-shopping-basket" style="font-size: 48px; color: #ddd; margin-bottom: 20px;"></i><p style="font-size: 18px;">В корзине пока пусто</p><a href="catalog.html" style="color: #E24C55; text-decoration: none; font-weight: 600;">Перейти к покупкам</a></div>';
            if(checkoutBtn) {
                checkoutBtn.disabled = true;
                checkoutBtn.style.opacity = '0.5';
                checkoutBtn.style.cursor = 'not-allowed';
            }
        } else {
            if(checkoutBtn) {
                checkoutBtn.disabled = false;
                checkoutBtn.style.opacity = '1';
                checkoutBtn.style.cursor = 'pointer';
            }

            cart.forEach((item, index) => {
                let priceNumber = parseInt(item.price.replace(/\D/g, '')); 
                let qty = item.quantity || 1; 
                let oldPriceNumber = Math.round(priceNumber * 1.3);
                
                total += priceNumber * qty; 
                totalCount += qty;

                const itemDiv = document.createElement('div');
                itemDiv.classList.add('cart-item');
                
                itemDiv.innerHTML = `
                    <div class="cart-checkbox"><i class="fas fa-check-square" style="color: #E24C55;"></i></div>
                    <div class="cart-img-wrapper"><img src="${item.image}" alt="${item.name}"></div>
                    <div class="cart-item-info"><h3>${item.name}</h3></div>
                    <div class="cart-controls">
                        <div class="quantity-control">
                            <button class="quantity-btn" onclick="changeQuantity(${index}, -1)">-</button>
                            <div class="quantity-value">${qty}</div>
                            <button class="quantity-btn" onclick="changeQuantity(${index}, 1)">+</button>
                        </div>
                        <div class="cart-actions-links">
                            <span class="action-link" onclick="removeItem(${index})">Удалить</span>
                            <span class="action-link add-from-cart-to-fav" data-idx="${index}">В избранное</span>
                        </div>
                    </div>
                    <div class="cart-price-block">
                        <span class="price-current">${(priceNumber * qty).toLocaleString()} ₽</span>
                        <span class="price-old">${(oldPriceNumber * qty).toLocaleString()} ₽</span>
                    </div>
                `;
                cartItemsContainer.appendChild(itemDiv);
            });
        }

        const totalEl = document.getElementById('cart-total-price');
        if(totalEl) totalEl.innerText = total.toLocaleString() + ' руб.';
        
        updateCartCount();
    }

    function updateCartCount() {
        let cart = JSON.parse(localStorage.getItem('shoppingCart')) || [];
        let totalQty = 0;
        cart.forEach(item => totalQty += (item.quantity || 1));
        const badge = document.getElementById('cart-count');
        if (badge) badge.innerText = totalQty;
    }
    updateCartCount();

    window.removeItem = function(index) {
        let cart = JSON.parse(localStorage.getItem('shoppingCart')) || [];
        cart.splice(index, 1);
        localStorage.setItem('shoppingCart', JSON.stringify(cart));
        renderCart();
        showNotify('Товар удален', 'info');
    };

    window.changeQuantity = function(index, change) {
        let cart = JSON.parse(localStorage.getItem('shoppingCart')) || [];
        if (cart[index]) {
            let currentQty = cart[index].quantity || 1;
            let newQty = currentQty + change;
            if (newQty < 1) newQty = 1;
            cart[index].quantity = newQty;
        }
        localStorage.setItem('shoppingCart', JSON.stringify(cart));
        renderCart(); 
    };


    /* ========================================================================
       6. ГАЛЕРЕЯ
       ======================================================================== */
    const mainImage = document.getElementById('main-product-img');
    const thumbs = document.querySelectorAll('.gallery-thumb');
    const arrowPrev = document.querySelector('.gallery-arrow.prev');
    const arrowNext = document.querySelector('.gallery-arrow.next');

    if (mainImage && thumbs.length > 0) {
        let currentIndex = 0;
        function updateGallery(index) {
            thumbs.forEach(t => t.classList.remove('active'));
            thumbs[index].classList.add('active');
            const newSrc = thumbs[index].getAttribute('src');
            mainImage.style.opacity = 0;
            setTimeout(() => { mainImage.src = newSrc; mainImage.style.opacity = 1; }, 200);
            currentIndex = index;
        }
        thumbs.forEach((thumb, index) => thumb.addEventListener('click', () => updateGallery(index)));
        if (arrowPrev) arrowPrev.addEventListener('click', () => {
            let newIndex = currentIndex - 1;
            if (newIndex < 0) newIndex = thumbs.length - 1;
            updateGallery(newIndex);
        });
        if (arrowNext) arrowNext.addEventListener('click', () => {
            let newIndex = currentIndex + 1;
            if (newIndex >= thumbs.length) newIndex = 0;
            updateGallery(newIndex);
        });
    }


    /* ========================================================================
       7. API ЯНДЕКС КАРТЫ
       ======================================================================== */
    const mapEl = document.getElementById('map');
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


    /* ========================================================================
       8. ИЗБРАННОЕ
       ======================================================================== */
    const favButtons = document.querySelectorAll('.add-to-favorites, .add-to-favorites-catalog');
    let favorites = JSON.parse(localStorage.getItem('myFavorites')) || [];

    function updateHeartIcons() {
        favButtons.forEach(btn => {
            const id = btn.getAttribute('data-id');
            const icon = btn.querySelector('i');
            if(!id || !icon) return;
            const exists = favorites.some(item => item.id === id);
            if (exists) {
                icon.classList.remove('far'); icon.classList.add('fas'); icon.style.color = '#E24C55';
            } else {
                icon.classList.remove('fas'); icon.classList.add('far'); icon.style.color = '';
            }
        });
    }
    updateHeartIcons();

    favButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault(); e.stopPropagation(); 
            const product = {
                id: btn.getAttribute('data-id'),
                name: btn.getAttribute('data-name'),
                price: btn.getAttribute('data-price'),
                img: btn.getAttribute('data-img'),
                link: btn.getAttribute('data-link')
            };
            if (!product.id) return; 
            const index = favorites.findIndex(item => item.id === product.id);
            if (index === -1) {
                favorites.push(product);
                showNotify('Добавлено в избранное', 'success');
            } else {
                favorites.splice(index, 1);
                showNotify('Удалено из избранного', 'info');
            }
            localStorage.setItem('myFavorites', JSON.stringify(favorites));
            updateHeartIcons();
        });
    });


    /* ========================================================================
       9. ОТРИСОВКА ИЗБРАННОГО
       ======================================================================== */
    const favoritesContainer = document.getElementById('favorites-container');
    if (favoritesContainer) {
        renderFavoritesPage();
    }

    function renderFavoritesPage() {
        let favorites = JSON.parse(localStorage.getItem('myFavorites')) || [];
        favoritesContainer.innerHTML = '';

        if (favorites.length === 0) {
            favoritesContainer.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 60px; color: #888;">
                <i class="far fa-heart" style="font-size: 60px; margin-bottom: 20px; opacity: 0.3;"></i>
                <h2>Список избранного пуст</h2>
                <p>Перейдите в <a href="catalog.html" style="color: #E24C55;">каталог</a></p></div>`;
            return;
        }

        favorites.forEach(item => {
            const card = document.createElement('div');
            card.classList.add('product-card');
            card.style.position = 'relative';
            card.innerHTML = `
                <button class="remove-from-fav" data-id="${item.id}" style="position: absolute; top: 10px; right: 10px; z-index: 10; background: white; border: 1px solid #eee; border-radius: 50%; width: 30px; height: 30px; cursor: pointer; display:flex; align-items:center; justify-content:center;">
                    <i class="fas fa-times" style="color: #888;"></i>
                </button>
                <a href="${item.link}" class="product-clickable-area" style="text-decoration:none; color:inherit;">
                    <div class="image-container" style="text-align:center; margin-bottom:10px;">
                        <img src="${item.img}" alt="${item.name}" style="max-width:100%; height:150px; object-fit:contain;">
                    </div>
                    <div class="product-info-bottom" style="padding:10px;">
                        <h3 style="font-size:16px; margin: 10px 0;">${item.name}</h3>
                        <div class="price-container"><span class="price" style="font-weight:bold; color:#E24C55; font-size:18px;">${item.price}</span></div>
                    </div>
                </a>
            `;
            favoritesContainer.appendChild(card);
        });

        document.querySelectorAll('.remove-from-fav').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idToRemove = btn.getAttribute('data-id');
                favorites = favorites.filter(item => item.id !== idToRemove);
                localStorage.setItem('myFavorites', JSON.stringify(favorites));
                renderFavoritesPage();
                updateHeartIcons(); 
            });
        });
    }

});