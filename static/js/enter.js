document.addEventListener('DOMContentLoaded', function() {
    const form = document.querySelector('.modal-form');
    
    form.addEventListener('submit', function(event) {
        event.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const csrfToken = form.querySelector('[name=csrfmiddlewaretoken]').value;

        fetch('/auth/login/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken
            },
            body: JSON.stringify({ email, password }),
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Ошибка входа');
            }
            return response.json();
        })
        .then(data => {
            console.log('Успех:', data);
            window.location.href = '/dashboard/';
        })
        .catch((error) => {
            console.error('Ошибка:', error);
            const errorMessage = document.querySelector('.alert');
            if (errorMessage) {
                errorMessage.innerHTML = '<h1>Неверная почта или пароль!</h1>';
                errorMessage.style.display = 'block';
            } else {
                alert('Неверная почта или пароль!');
            }
        });
    });
});