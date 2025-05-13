document.addEventListener('DOMContentLoaded', function() {
    const form = document.querySelector('#loginForm');
    
    if (!form) return;
    
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        const email = document.querySelector('#email').value;
        const password = document.querySelector('#password').value;
        const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;
        
        const errorAlert = document.querySelector('#errorAlert');
        const successAlert = document.querySelector('#successAlert');
        
        // Сбрасываем состояние уведомлений
        if (errorAlert) {
            errorAlert.style.display = 'none';
            errorAlert.innerHTML = '';
        }
        
        if (successAlert) {
            successAlert.style.display = 'none';
            successAlert.innerHTML = '';
        }
        
        try {
            const response = await fetch('/auth/login/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken
                },
                body: JSON.stringify({
                    email: email,
                    password: password
                }),
            });
            
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Получен неверный формат ответа от сервера');
            }
            
            const data = await response.json();
            
            if (response.ok) {
                // При успешной авторизации
                if (successAlert) {
                    successAlert.innerHTML = '<p>Вход выполнен успешно. Перенаправление...</p>';
                    successAlert.style.display = 'block';
                }
                
                // Перенаправление на соответствующую страницу
                setTimeout(() => {
                    window.location.href = data.redirect || '/dashboard/';
                }, 1000);
            } else {
                // При ошибке
                if (errorAlert) {
                    errorAlert.innerHTML = '<p>' + (data.message || 'Ошибка авторизации') + '</p>';
                    errorAlert.style.display = 'block';
                }
            }
        } catch (error) {
            console.error('Ошибка при отправке данных:', error);
            if (errorAlert) {
                errorAlert.innerHTML = '<p>Произошла ошибка при отправке данных: ' + error.message + '</p>';
                errorAlert.style.display = 'block';
            }
        }
    });
}); 