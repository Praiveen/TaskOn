document.addEventListener('DOMContentLoaded', function() {
    const form = document.querySelector('#registerForm');
    if (!form) return; 

    
    const firstNameInput = document.querySelector('#firstName');
    const lastNameInput = document.querySelector('#lastName');
    const fullNameInput = document.querySelector('#fullName');

    if (firstNameInput && lastNameInput && fullNameInput) {
        
        function updateFullName() {
            if (!fullNameInput.value.trim()) {
                const firstName = firstNameInput.value.trim();
                const lastName = lastNameInput.value.trim();
                if (firstName && lastName) {
                    fullNameInput.value = `${firstName} ${lastName}`;
                }
            }
        }

        firstNameInput.addEventListener('blur', updateFullName);
        lastNameInput.addEventListener('blur', updateFullName);
    }

    const errorAlert = document.querySelector('#errorAlert');
    const successAlert = document.querySelector('#successAlert');

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        
        if (errorAlert) {
            errorAlert.style.display = 'none';
            errorAlert.innerHTML = "";
        }
        
        if (successAlert) {
            successAlert.style.display = 'none';
            successAlert.innerHTML = "";
        }

        
        const password = document.querySelector('#password').value;
        const passwordConfirm = document.querySelector('#passwordConfirm').value;

        if (password !== passwordConfirm) {
            if (errorAlert) {
                errorAlert.innerHTML = "<p>Пароли не совпадают</p>";
                errorAlert.style.display = 'block';
            }
            return;
        }

        if (password.length < 5) {
            if (errorAlert) {
                errorAlert.innerHTML = "<p>Пароль должен содержать минимум 5 символов</p>";
                errorAlert.style.display = 'block';
            }
            return;
        }

        const formData = new FormData(form);
        const csrfToken = form.querySelector('[name=csrfmiddlewaretoken]').value;

        const data = {};
        formData.forEach((value, key) => {
            if (key !== 'csrfmiddlewaretoken') {
                data[key] = value;
            }
        });

        
        if (!data.fullName && data.firstName && data.lastName) {
            data.fullName = `${data.firstName} ${data.lastName}`;
        }

        try {
            const response = await fetch('/auth/signup/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken
                },
                body: JSON.stringify(data),
            });

            let responseData;
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                responseData = await response.json();
            } else {
                throw new Error('Получен неверный формат ответа от сервера');
            }
            
            if (!response.ok) {
                let errorMsg = responseData.message || 'Произошла ошибка при регистрации';
                
                
                if (responseData.errors) {
                    const errorMessages = [];
                    for (const field in responseData.errors) {
                        errorMessages.push(`${field}: ${responseData.errors[field].join(', ')}`);
                    }
                    if (errorMessages.length > 0) {
                        errorMsg += '. ' + errorMessages.join('. ');
                    }
                }
                
                if (errorAlert) {
                    errorAlert.innerHTML = '<p>' + errorMsg + '</p>';
                    errorAlert.style.display = 'block';
                }
            } else {
                if (successAlert) {
                    successAlert.innerHTML = '<p>' + responseData.message + '</p>';
                    successAlert.style.display = 'block';
                    
                    
                    setTimeout(() => {
                        window.location.href = '/login/';
                    }, 2000);
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