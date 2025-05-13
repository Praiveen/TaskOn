
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}


const csrfToken = getCookie('csrftoken') || document.querySelector('[name=csrfmiddlewaretoken]')?.value;

document.addEventListener('DOMContentLoaded', () => {
    const tabs = document.querySelectorAll('.tab');
    const contents = document.querySelectorAll('.content');

    if (!tabs.length || !contents.length) return;

    let activeTab = tabs[0];
    let activeContent = contents[0];
    let isAnimating = false;

    activeTab.classList.add('active');
    activeContent.style.top = '0';
    activeContent.style.opacity = '1';
    activeContent.style.zIndex = '2';

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            if (tab === activeTab || isAnimating) return;

            isAnimating = true;

            activeTab.classList.remove('active');
            tab.classList.add('active');
            activeTab = tab;

            const targetContent = document.querySelector(`#${tab.dataset.target}`);
            if (!targetContent) {
                isAnimating = false;
                return;
            }

            activeContent.style.transition = 'top 0.5s ease-in-out, opacity 0.5s ease-in-out';
            activeContent.style.top = '-100%';
            activeContent.style.opacity = '0';

            targetContent.style.transition = 'none';
            targetContent.style.top = '100%';
            targetContent.style.opacity = '0';
            targetContent.style.zIndex = '2';

            setTimeout(() => {
                targetContent.style.transition = 'top 0.5s ease-in-out, opacity 0.5s ease-in-out';
                targetContent.style.top = '0';
                targetContent.style.opacity = '1';

                setTimeout(() => {
                    activeContent.style.zIndex = '1';
                    targetContent.style.zIndex = '2';
                    activeContent = targetContent;
                    isAnimating = false;
                }, 500);
            }, 50);
        });
    });
});


document.addEventListener('DOMContentLoaded', function () {
    loadNotifications();
});

function loadNotifications() {
    fetch('/dashboard/notifications/', {
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Ошибка при загрузке уведомлений');
            }
            return response.json();
        })
        .then(notifications => {
            const container = document.getElementById('notifications-container');
            if (!container) return;

            container.innerHTML = '';

            if (!notifications || notifications.length === 0) {
                container.innerHTML = '<p class="notification-not-message">Нет новых уведомлений</p>';
                return;
            }

            notifications.forEach(notification => {
                const notificationElement = createNotificationElement(notification);
                container.appendChild(notificationElement);
            });
        })
        .catch(error => {
            console.error('Ошибка при загрузке уведомлений:', error);
        });
}

function createNotificationElement(notification) {
    const div = document.createElement('div');
    div.className = 'notification-item';

    if (!notification || !notification.type) {
        div.innerHTML = `
        <div class="notification-content">
            <p class="notification-message">Неизвестное уведомление</p>
        </div>`;
        return div;
    }

    if (notification.type == "simpleMessage") {
        div.innerHTML = `
        <div class="notification-content">
            <p class="notification-message">${notification.message || 'Нет сообщения'}</p>
            <p class="notification-details">
                От: ${notification.senderName || 'Неизвестно'}<br>
                Компания: ${notification.companyName || 'Не указано'}<br>
                Дата: ${formatDate(notification.sendDate)}
            </p>
            <div class="notification-actions">
                <button class="readNotification" onclick="readNotification(${notification.id})">Отметить прочитанным</button>
            </div>
        </div>
        `;
    }
    else if (notification.type == "actionMessage") {
        div.innerHTML = `
        <div class="notification-content">
            <p class="notification-message">${notification.message || 'Нет сообщения'}</p>
            <p class="notification-details">
                От: ${notification.senderName || 'Неизвестно'}<br>
                Компания: ${notification.companyName || 'Не указано'}<br>
                Дата: ${formatDate(notification.sendDate)}
            </p>
            <div class="notification-actions">
                <button class="accept-button" onclick="acceptRequest(${notification.id})">Принять</button>
                <button class="reject-button" onclick="rejectRequest(${notification.id})">Отклонить</button>
            </div>
        </div>
        `;
    }

    return div;
}

function formatDate(dateString) {
    if (!dateString) return 'Неизвестно';

    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Некорректная дата';

    return date.toLocaleString('ru-RU');
}


window.acceptRequest = function (notificationId) {
    fetch(`/dashboard/notifications/accept/${notificationId}/`, {
        method: 'POST',
        headers: {
            'X-CSRFToken': csrfToken,
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => { throw new Error(err.message || 'Ошибка при принятии заявки'); });
            }
            return response.json();
        })
        .then(data => {
            alert(data.message || 'Заявка принята');
            loadNotifications();
        })
        .catch(error => {
            console.error('Ошибка при принятии заявки:', error);
            alert('Ошибка при принятии заявки: ' + error.message);
        });
}

window.rejectRequest = function (notificationId) {
    fetch(`/dashboard/notifications/reject/${notificationId}/`, {
        method: 'POST',
        headers: {
            'X-CSRFToken': csrfToken,
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => { throw new Error(err.message || 'Ошибка при отклонении заявки'); });
            }
            return response.json();
        })
        .then(data => {
            alert(data.message || 'Заявка отклонена');
            loadNotifications();
        })
        .catch(error => {
            console.error('Ошибка при отклонении заявки:', error);
            alert('Ошибка при отклонении заявки: ' + error.message);
        });
}

window.readNotification = function (notificationId) {
    fetch(`/dashboard/notifications/read/${notificationId}/`, {
        method: 'POST',
        headers: {
            'X-CSRFToken': csrfToken,
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => { throw new Error(err.message || 'Ошибка при обработке уведомления'); });
            }
            return response.json();
        })
        .then(data => {
            alert(data.message || 'Уведомление отмечено как прочитанное');
            loadNotifications();
        })
        .catch(error => {
            console.error('Ошибка при обработке уведомления:', error);
            alert('Ошибка: ' + error.message);
        });
}
