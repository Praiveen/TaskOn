/**
 * Модуль для выбора и сохранения предпочтительного режима работы пользователя
 */

let selectedMode = null;

/**
 * Выбирает режим и обновляет UI
 * @param {string} mode - Выбранный режим (personal, corporate, both)
 */
function selectMode(mode) {
    selectedMode = mode;
    
    // Проверка корректности выбранного режима
    if (selectedMode !== 'personal' && selectedMode !== 'corporate' && selectedMode !== 'both') {
        console.error("Выбран некорректный режим:", selectedMode);
        return;
    }
    
    // Сбросить все выделения
    document.querySelectorAll('.mode-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Выделить выбранную карточку
    document.getElementById(mode + '-mode').classList.add('selected');
    
    // Показать кнопку "Продолжить"
    document.getElementById('continue-btn').classList.remove('hidden');
}

/**
 * Сохраняет предпочтения пользователя и перенаправляет на соответствующую страницу
 */
function savePreferences() {
    if (!selectedMode) {
        alert('Пожалуйста, выберите режим работы');
        return;
    }
    
    // Получение CSRF-токена из мета-тега
    const csrftoken = document.querySelector('input[name="csrfmiddlewaretoken"]').value;
    
    // Преобразование режима в верхний регистр для соответствия константам модели User
    const modeMapping = {
        'personal': 'PERSONAL',
        'corporate': 'CORPORATE',
        'both': 'BOTH'
    };
    
    // Убедимся, что у нас точно есть значение режима
    const modeToSend = modeMapping[selectedMode];
    
    // Отправка предпочтений на сервер
    fetch('/users/set-preferred-mode/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrftoken,
        },
        body: JSON.stringify({
            mode: modeToSend
        })
    })
    .then(response => {
        if (response.ok) {
            return response.json();
        }
        throw new Error('Ошибка при сохранении настроек');
    })
    .then(data => {
        // Перенаправление на соответствующую страницу
        if (selectedMode === 'personal') {
            // Перенаправляем на страницу личных встреч
            window.location.href = '/personal-meetings/';
        } else if (selectedMode === 'corporate' || selectedMode === 'both') {
            // Перенаправляем на страницу создания/выбора компании
            window.location.href = '/dashboard/starter/createCompany/';
        } else if (data.redirect) {
            window.location.href = data.redirect;
        }
    })
    .catch(error => {
        console.error('Ошибка:', error);
        alert('Произошла ошибка при сохранении настроек');
    });
}

// Обработчик для кнопки отправки заявки на присоединение к компании
document.addEventListener('DOMContentLoaded', function() {
    // Если есть кнопка отправки заявки, добавляем обработчик
    const sendRequestBtn = document.getElementById('sendRequestBtn');
    if (sendRequestBtn) {
        sendRequestBtn.addEventListener('click', function() {
            this.clicked = true;
        });
    }
    
    // Если есть кнопка создания компании, добавляем обработчик
    const createCompanyBtn = document.getElementById('createCompanyBtn');
    if (createCompanyBtn) {
        createCompanyBtn.addEventListener('click', function() {
            this.clicked = true;
        });
    }
}); 