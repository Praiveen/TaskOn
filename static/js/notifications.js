document.addEventListener('DOMContentLoaded', () => {
    console.log('Инициализация обработчиков для уведомлений');
    
    
    initNotifications();
    
    
    loadNotifications();
});

/**
 * Инициализация функций работы с уведомлениями
 */
function initNotifications() {
    console.log('Инициализируем обработчики для кнопок в уведомлениях');
    
    
    document.querySelectorAll('.readNotification').forEach(button => {
        button.addEventListener('click', function() {
            const notificationId = this.dataset.notificationId;
            markNotificationAsRead(notificationId);
        });
    });
    
    
    document.querySelectorAll('.accept-button').forEach(button => {
        button.addEventListener('click', function() {
            const notificationId = this.dataset.notificationId;
            acceptRequest(notificationId);
        });
    });
    
    
    document.querySelectorAll('.reject-button').forEach(button => {
        button.addEventListener('click', function() {
            const notificationId = this.dataset.notificationId;
            rejectRequest(notificationId);
        });
    });
}

/**
 * Загрузка уведомлений с сервера
 */
function loadNotifications() {
    console.log('Загружаем уведомления с сервера');
    fetch('/dashboard/notifications/', {
        method: 'GET',
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'include'
    })
    .then(response => {
        console.log('Получен ответ:', response.status);
        if (!response.ok) {
            if (response.status === 404) {
                console.warn('Эндпоинт уведомлений не найден');
                return [];
            }
            throw new Error(`Ошибка при загрузке: ${response.status}`);
        }
        
        return response.text().then(text => {
            try {
                return JSON.parse(text);
            } catch (e) {
                console.error('Ошибка парсинга JSON:', e);
                console.log('Текст ответа:', text);
                return [];
            }
        });
    })
    .then(data => {
        console.log('Данные уведомлений:', data);
        displayNotifications(data);
    })
    .catch(error => {
        console.error('Ошибка при загрузке уведомлений:', error);
        const container = document.getElementById('notifications-container');
        if (container) {
            container.innerHTML = '<p class="notification-not-message">Ошибка загрузки уведомлений</p>';
        }
    });
}

/**
 * Отображение уведомлений в интерфейсе
 */
function displayNotifications(notifications) {
    const container = document.getElementById('notifications-container');
    
    if (!container) {
        console.error('Контейнер для уведомлений не найден');
        return;
    }
    
    console.log('Отображаем уведомления:', notifications ? notifications.length : 0);
    
    if (!notifications || notifications.length === 0) {
        container.innerHTML = '<p class="notification-not-message">Нет новых уведомлений</p>';
        return;
    }
    
    container.innerHTML = '';
    
    
    notifications.sort((a, b) => new Date(b.sendDate) - new Date(a.sendDate));
    
    notifications.forEach(notification => {
        const notificationItem = document.createElement('div');
        notificationItem.className = 'notification-item';
        
        const notificationId = notification.id || notification.notificationId;
        notificationItem.dataset.notificationId = notificationId;
        
        const date = new Date(notification.sendDate);
        const formattedDate = date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).replace(',', '');
        
        
        if (notification.type === 'actionMessage') {
            console.log('Уведомление типа actionMessage');
            notificationItem.innerHTML = `
                <div class="notification-message">${notification.message}</div>
                <div class="notification-details">${formattedDate}</div>
                <div class="notification-actions">
                    <button class="accept-button" data-notification-id="${notificationId}">Принять</button>
                    <button class="reject-button" data-notification-id="${notificationId}">Отклонить</button>
                </div>
            `;
        } else {
            notificationItem.innerHTML = `
                <div class="notification-message">${notification.message}</div>
                <div class="notification-details">${formattedDate}</div>
                <div class="notification-actions">
                    <button class="readNotification" data-notification-id="${notificationId}">Прочитано</button>
                </div>
            `;
        }
        
        container.appendChild(notificationItem);
    });
    
    
    initNotifications();
}

/**
 * Отмечает уведомление как прочитанное
 */
function markNotificationAsRead(notificationId) {
    console.log('Отмечаем уведомление как прочитанное:', notificationId);
    
    fetch(`/dashboard/notifications/read/${notificationId}/`, {
        method: 'POST',
        headers: {
            'X-CSRFToken': getCsrfToken(),
            'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'include'
    })
    .then(response => {
        console.log('Ответ на чтение уведомления:', response.status);
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('Уведомление не найдено');
            }
            
            
            return response.text().then(text => {
                try {
                    const data = JSON.parse(text);
                    throw new Error(data.message || 'Ошибка при отметке уведомления');
                } catch (e) {
                    throw new Error('Ошибка при обработке ответа сервера');
                }
            });
        }
        return response.text().then(text => {
            try {
                return JSON.parse(text);
            } catch (e) {
                
                return { success: true, message: 'Уведомление отмечено как прочитанное' };
            }
        });
    })
    .then(data => {
        console.log('Уведомление отмечено:', data);
        removeNotificationFromDOM(notificationId);
    })
    .catch(error => {
        console.error('Ошибка при отметке уведомления:', error);
        alert(error.message || 'Не удалось отметить уведомление как прочитанное');
    });
}

/**
 * Принимает запрос из уведомления
 */
function acceptRequest(notificationId) {
    console.log('Принимаем запрос:', notificationId);
    
    fetch(`/dashboard/notifications/accept/${notificationId}/`, {
        method: 'POST',
        headers: {
            'X-CSRFToken': getCsrfToken(),
            'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'include'
    })
    .then(response => {
        console.log('Ответ на принятие запроса:', response.status);
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('Запрос не найден');
            }
            
            return response.text().then(text => {
                try {
                    const data = JSON.parse(text);
                    throw new Error(data.message || 'Ошибка при принятии запроса');
                } catch (e) {
                    throw new Error('Ошибка при обработке ответа сервера');
                }
            });
        }
        return response.text().then(text => {
            try {
                return JSON.parse(text);
            } catch (e) {
                return { success: true, message: 'Запрос успешно принят' };
            }
        });
    })
    .then(data => {
        console.log('Запрос принят:', data);
        alert(data.message || 'Запрос успешно принят');
        removeNotificationFromDOM(notificationId);
    })
    .catch(error => {
        console.error('Ошибка при принятии запроса:', error);
        alert(error.message || 'Не удалось принять запрос');
    });
}

/**
 * Отклоняет запрос из уведомления
 */
function rejectRequest(notificationId) {
    console.log('Отклоняем запрос:', notificationId);
    
    fetch(`/dashboard/notifications/reject/${notificationId}/`, {
        method: 'POST',
        headers: {
            'X-CSRFToken': getCsrfToken(),
            'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'include'
    })
    .then(response => {
        console.log('Ответ на отклонение запроса:', response.status);
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('Запрос не найден');
            }
            
            return response.text().then(text => {
                try {
                    const data = JSON.parse(text);
                    throw new Error(data.message || 'Ошибка при отклонении запроса');
                } catch (e) {
                    throw new Error('Ошибка при обработке ответа сервера');
                }
            });
        }
        return response.text().then(text => {
            try {
                return JSON.parse(text);
            } catch (e) {
                return { success: true, message: 'Запрос успешно отклонен' };
            }
        });
    })
    .then(data => {
        console.log('Запрос отклонен:', data);
        alert(data.message || 'Запрос успешно отклонен');
        removeNotificationFromDOM(notificationId);
    })
    .catch(error => {
        console.error('Ошибка при отклонении запроса:', error);
        alert(error.message || 'Не удалось отклонить запрос');
    });
}

/**
 * Удаляет уведомление из DOM с анимацией
 */
function removeNotificationFromDOM(notificationId) {
    const notification = document.querySelector(`.notification-item[data-notification-id="${notificationId}"]`);
    if (notification) {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        notification.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        
        setTimeout(() => {
            notification.remove();
            
            
            const container = document.getElementById('notifications-container');
            if (container && container.querySelectorAll('.notification-item').length === 0) {
                container.innerHTML = '<p class="notification-not-message">Нет новых уведомлений</p>';
            }
        }, 300);
    }
}

/**
 * Получение CSRF-токена из cookie
 */
function getCsrfToken() {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, 'csrftoken='.length) === 'csrftoken=') {
                cookieValue = decodeURIComponent(cookie.substring('csrftoken='.length));
                break;
            }
        }
    }
    return cookieValue;
} 