document.addEventListener('DOMContentLoaded', async () => {
    // Получаем CSRF-токен для запросов
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;
    
    try {
        const response = await fetch('/users/userData/', {
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        
        if (!response.ok) {
            throw new Error('Ошибка загрузки данных профиля');
        }
        
        const userData = await response.json();
        
        document.getElementById('email').value = userData.email || '';
        document.getElementById('firstName').value = userData.firstName || '';
        document.getElementById('lastName').value = userData.lastName || '';
        document.getElementById('phone').value = userData.phoneNumber || 'Не указано';
        
        document.getElementById('company').value = userData.company ? userData.company.name : 'Не указано';
        document.getElementById('department').value = userData.department ? userData.department.name : 'Не указано';
        document.getElementById('subDepartment').value = userData.subDepartment ? userData.subDepartment.name : 'Не указано';

        // Обработка ролей
        if (userData.roles && userData.roles.length > 0) {
            const roleNames = userData.roles.map(role => role.name).join(', ');
            document.getElementById('role').value = roleNames;
        } else {
            document.getElementById('role').value = 'Не указано';
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showMessage('Ошибка загрузки данных', false);
    }

    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const updateData = {
                firstName: document.getElementById('firstName').value,
                lastName: document.getElementById('lastName').value,
                phoneNumber: document.getElementById('phone').value
            };

            try {
                const response = await fetch('/users/userData/update/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': csrfToken
                    },
                    body: JSON.stringify(updateData)
                });

                if (response.ok) {
                    showMessage('Данные успешно обновлены', true);
                    
                    // Обновляем данные на странице
                    const updatedResponse = await fetch('/users/userData/', {
                        headers: {
                            'X-Requested-With': 'XMLHttpRequest'
                        }
                    });
                    
                    if (updatedResponse.ok) {
                        const updatedUserData = await updatedResponse.json();
                        
                        document.getElementById('firstName').value = updatedUserData.firstName || '';
                        document.getElementById('lastName').value = updatedUserData.lastName || '';
                        document.getElementById('phone').value = updatedUserData.phoneNumber || 'Не указано';
                    }
                } else {
                    showMessage('Ошибка обновления данных', false);
                }
            } catch (error) {
                console.error('Ошибка:', error);
                showMessage('Ошибка обновления данных', false);
            }
        });
    }
});

function showMessage(message, isSuccess) {
    const statusElement = document.getElementById('statusMessage');
    if (statusElement) {
        statusElement.textContent = message;
        statusElement.className = `status-message ${isSuccess ? 'success' : 'error'}`;
        statusElement.style.display = 'block';
        
        setTimeout(() => {
            statusElement.style.display = 'none';
        }, 3000);
    } else {
        // Fallback if status element is not found
        alert(message);
    }
}