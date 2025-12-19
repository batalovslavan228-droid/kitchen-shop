document.addEventListener('DOMContentLoaded', () => {

    /* ========================================================================
       0. СИСТЕМА УВЕДОМЛЕНИЙ (TOASTS)
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
       1. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ (ВАЛИДАЦИИ)
       ======================================================================== */
    function setError(element, message) {
        const formGroup = element.parentElement;
        const errorDisplay = formGroup.querySelector('.error-message');
        if (errorDisplay) {
            formGroup.classList.add('error');
            errorDisplay.innerText = message;
            errorDisplay.style.display = 'block';
        }
    }

    function setSuccess(element) {
        const formGroup = element.parentElement;
        const errorDisplay = formGroup.querySelector('.error-message');
        if (errorDisplay) {
            formGroup.classList.remove('error');
            formGroup.classList.add('success');
            errorDisplay.style.display = 'none';
        }
    }

    function isValidEmail(email) {
        const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(String(email).toLowerCase());
    }

    // ВАЖНО: Проверка телефона (оставили, как ты просил)
    function isValidPhone(phone) {
        const re = /^[\d\+\-\(\)\s]+$/; // Разрешаем цифры и символы +, -, (, )
        const digits = phone.replace(/\D/g, ''); // Считаем только цифры
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
            
            // Простая валидация для формы регистрации
            let valid = true;
            if(username.value.trim() === '') { setError(username, 'Введите имя'); valid=false; } else setSuccess(username);
            if(!isValidEmail(email.value.trim())) { setError(email, 'Некорректный email'); valid=false; } else setSuccess(email);
            if(password.value.trim().length < 6) { setError(password, 'Мин. 6 символов'); valid=false; } else setSuccess(password);
            if(password2.value.trim() !== password.value.trim()) { setError(password2, 'Пароли не совпадают'); valid=false; } else setSuccess(password2);

            if (valid) {
                fetch('/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username: username.value.trim(),
                        email: email.value.trim(),
                        password: password.value.trim()
                    })
                })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        showNotify('Регистрация успешна!', 'success');
                        setTimeout(() => window.location.href = 'login.html', 1500);
                    } else {
                        showNotify(data.message, 'error');
                    }
                })
                .catch(() => showNotify('Ошибка сервера', 'error'));
            }
        });
    }


    /* ========================================================================
       3. ВХОД
       ======================================================================== */
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        if (localStorage.getItem('isLoggedIn') === 'true') window.location.href = 'account.html';

        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email');
            const password = document.getElementById('login-password');

            fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.value.trim(), password: password.value.trim() })
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    localStorage.setItem('isLoggedIn', 'true');
                    localStorage.setItem('kitchenShopUserId', data.user.id);
                    localStorage.setItem('kitchenShopUserName', data.user.username);
                    localStorage.setItem('kitchenShopUserEmail', data.user.email);
                    showNotify('Вход выполнен!', 'success');
                    setTimeout(() => window.location.href = 'account.html', 1000);
                } else {
                    showNotify(data.message, 'error');
                }
            })
            .catch(() => showNotify('Ошибка сервера', 'error'));
        });
    }


    /* ========================================================================
       4. ЛИЧНЫЙ КАБИНЕТ
       ======================================================================== */
    const accountUsername = document.getElementById('account-username');
    if (accountUsername) { 
        if (localStorage.getItem('isLoggedIn') !== 'true') {
            window.location.href = 'login.html';
        } else {
            document.getElementById('account-username').textContent = localStorage.getItem('kitchenShopUserName');
            document.getElementById('account-email').textContent = localStorage.getItem('kitchenShopUserEmail');
            
            document.getElementById('logout-button').addEventListener('click', () => {
                localStorage.clear(); // Полная очистка при выходе
                showNotify('Вы вышли', 'info');
                setTimeout(() => window.location.href = 'login.html', 1000);
            });
        }
    }
    
    // Ссылка профиля просто ведет куда надо
    const profileLink = document.getElementById('profile-link');
    if (profileLink && localStorage.getItem('isLoggedIn') === 'true') {
        profileLink.href = 'account.html';
        profileLink.style.color = '#E24C55'; // Подсветка если вошли
    }


    /* ========================================================================
       5. КОРЗИНА (ОФОРМЛЕНИЕ ЗАКАЗА)
       ======================================================================== */
    
    // А. Добавление в корзину
    const addToCartBtn = document.getElementById('buy-now-btn');
    if (addToCartBtn) {
        addToCartBtn.addEventListener('click', () => {
            const title = document.querySelector('.product-info h1').innerText;
            const price = document.querySelector('.product-info .price').innerText;
            let imageSrc = document.getElementById('main-product-img') ? document.getElementById('main-product-img').src : document.querySelector('.product-image img').src;

            let cart = JSON.parse(localStorage.getItem('shoppingCart')) || [];
            let existing = cart.find(i => i.name === title);
            if(existing) existing.quantity = (existing.quantity || 1) + 1;
            else cart.push({ name: title, price: price, image: imageSrc, quantity: 1 });
            
            localStorage.setItem('shoppingCart', JSON.stringify(cart));
            showNotify('Товар в корзине', 'success');
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
                if(confirm('Очистить корзину?')) {
                    localStorage.removeItem('shoppingCart');
                    renderCart();
                }
            });
        }

        const checkoutBtn = document.getElementById('checkout-btn');
        const modal = document.getElementById('purchase-modal');
        const purchaseForm = document.getElementById('purchase-form');

        // КНОПКА "ОФОРМИТЬ ЗАКАЗ"
        if (checkoutBtn && modal) {
            checkoutBtn.addEventListener('click', () => {
                
                // === УБРАЛИ ПРОВЕРКУ НА АВТОРИЗАЦИЮ ЗДЕСЬ ===
                // Просто смотрим, не пустая ли корзина
                
                const cart = JSON.parse(localStorage.getItem('shoppingCart')) || [];
                if (cart.length === 0) {
                    showNotify('Корзина пуста', 'error');
                } else {
                    modal.classList.add('active'); // Сразу открываем окно
                }
            });

            document.getElementById('modal-close-btn').addEventListener('click', (e) => {
                e.preventDefault(); modal.classList.remove('active');
            });

            // ОТПРАВКА ФОРМЫ ЗАКАЗА
            if(purchaseForm) {
                purchaseForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    
                    const name = document.getElementById('purchase-name').value;
                    const phone = document.getElementById('purchase-phone').value;
                    const address = document.getElementById('purchase-address').value;
                    
                    // Мы всё равно пытаемся отправить ID юзера, если он есть, но не требуем его жестко в JS
                    const userId = localStorage.getItem('kitchenShopUserId'); 

                    // ВАЖНО: ВАЛИДАЦИЯ ТЕЛЕФОНА (оставили)
                    if (name.trim() === '') {
                        showNotify('Введите имя', 'error'); return;
                    }
                    if (!isValidPhone(phone)) {
                        showNotify('Некорректный телефон (мин. 10 цифр)', 'error'); return;
                    }
                    if (address.trim() === '') {
                        showNotify('Введите адрес', 'error'); return;
                    }

                    try {
                        const res = await fetch('/api/checkout', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ name, phone, address, userId }) 
                        });
                        const data = await res.json();
                        
                        if(data.success) {
                            showNotify(`Заказ №${data.orderId} оформлен!`, 'success');
                            localStorage.removeItem('shoppingCart');
                            modal.classList.remove('active');
                            purchaseForm.reset();
                            renderCart();
                        } else {
                            // Если сервер ругается (например, требует ID), покажем ошибку
                            showNotify('Ошибка: ' + data.message, 'error');
                        }
                    } catch(err) { showNotify('Ошибка сети', 'error'); }
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
        
        if(cart.length === 0) {
            cartItemsContainer.innerHTML = '<div style="text-align:center; padding: 40px;">Корзина пуста</div>';
            document.getElementById('checkout-btn').disabled = true;
        } else {
            document.getElementById('checkout-btn').disabled = false;
        }

        cart.forEach((item, index) => {
            let price = parseInt(item.price.replace(/\D/g, ''));
            let qty = item.quantity || 1;
            total += price * qty;
            
            const div = document.createElement('div');
            div.className = 'cart-item';
            div.innerHTML = `
                <div class="cart-checkbox"><i class="fas fa-check-square" style="color:#E24C55"></i></div>
                <div class="cart-img-wrapper"><img src="${item.image}"></div>
                <div class="cart-item-info"><h3>${item.name}</h3></div>
                <div class="cart-controls">
                    <div class="quantity-control">
                        <button class="quantity-btn" onclick="chQty(${index}, -1)">-</button>
                        <div class="quantity-value">${qty}</div>
                        <button class="quantity-btn" onclick="chQty(${index}, 1)">+</button>
                    </div>
                    <span class="action-link" onclick="rmItem(${index})">Удалить</span>
                </div>
                <div class="cart-price-block"><span class="price-current">${(price * qty).toLocaleString()} ₽</span></div>
            `;
            cartItemsContainer.appendChild(div);
        });
        
        const totalEl = document.getElementById('cart-total-price');
        if(totalEl) totalEl.innerText = total.toLocaleString() + ' руб.';
        updateCartCount();
    }

    function updateCartCount() {
        let cart = JSON.parse(localStorage.getItem('shoppingCart')) || [];
        let t = 0; cart.forEach(i => t += (i.quantity || 1));
        const b = document.getElementById('cart-count');
        if(b) b.innerText = t;
    }
    updateCartCount();

    window.rmItem = (i) => {
        let c = JSON.parse(localStorage.getItem('shoppingCart'));
        c.splice(i, 1);
        localStorage.setItem('shoppingCart', JSON.stringify(c));
        renderCart();
    };
    window.chQty = (i, d) => {
        let c = JSON.parse(localStorage.getItem('shoppingCart'));
        c[i].quantity = Math.max(1, (c[i].quantity || 1) + d);
        localStorage.setItem('shoppingCart', JSON.stringify(c));
        renderCart();
    };

    /* ========================================================================
       6. ГАЛЕРЕЯ
       ======================================================================== */
    const mainImage = document.getElementById('main-product-img');
    const thumbs = document.querySelectorAll('.gallery-thumb');
    
    if (mainImage && thumbs.length > 0) {
        thumbs.forEach((thumb, index) => {
            thumb.addEventListener('click', () => {
                thumbs.forEach(t => t.classList.remove('active'));
                thumb.classList.add('active');
                mainImage.src = thumb.src;
            });
        });
    }

    /* ========================================================================
       7. ИЗБРАННОЕ
       ======================================================================== */
    const favButtons = document.querySelectorAll('.add-to-favorites-catalog');
    let favorites = JSON.parse(localStorage.getItem('myFavorites')) || [];
    
    function updHearts() {
        favButtons.forEach(btn => {
            const id = btn.dataset.id;
            const icon = btn.querySelector('i');
            if(favorites.some(f => f.id === id)) {
                icon.className = 'fas fa-heart'; icon.style.color = '#E24C55';
            } else {
                icon.className = 'far fa-heart'; icon.style.color = '';
            }
        });
    }
    updHearts();
    
    favButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const p = { id: btn.dataset.id, name: btn.dataset.name, price: btn.dataset.price, img: btn.dataset.img, link: btn.dataset.link };
            const idx = favorites.findIndex(f => f.id === p.id);
            if(idx === -1) { favorites.push(p); showNotify('Добавлено в избранное', 'success'); } 
            else { favorites.splice(idx, 1); showNotify('Удалено', 'info'); }
            localStorage.setItem('myFavorites', JSON.stringify(favorites));
            updHearts();
        });
    });

    const favCont = document.getElementById('favorites-container');
    if(favCont) {
        if(favorites.length === 0) favCont.innerHTML = '<div style="padding:40px; text-align:center">Пусто</div>';
        else {
            favorites.forEach(f => {
                const d = document.createElement('div');
                d.className = 'product-card';
                d.innerHTML = `
                    <button class="remove-from-fav" data-id="${f.id}" style="position:absolute; right:10px; top:10px;">X</button>
                    <a href="${f.link}"><img src="${f.img}" style="height:100px; display:block; margin:0 auto;"><h3>${f.name}</h3></a>
                `;
                favCont.appendChild(d);
            });
            document.querySelectorAll('.remove-from-fav').forEach(b => {
                b.addEventListener('click', (e) => {
                    favorites = favorites.filter(f => f.id !== e.target.dataset.id);
                    localStorage.setItem('myFavorites', JSON.stringify(favorites));
                    location.reload();
                });
            });
        }
    }

});