// personalMeetings.js - Основной скрипт для страницы личных встреч

// Глобальные переменные
let currentUserId = null;

document.addEventListener('DOMContentLoaded', function() {
    // Получаем ID текущего пользователя из data-атрибута
    const userIdElement = document.getElementById('currentUserId');
    if (userIdElement) {
        currentUserId = userIdElement.dataset.userId;
        console.log('Текущий пользователь ID:', currentUserId);
    }
    
    // Инициализация компонентов страницы
    initTabs();
    initModals();
    
    // Загрузка данных при загрузке страницы
    loadOverviewData();
    loadTemplates();
    
    // Добавление обработчиков событий для форм
    setupFormHandlers();
    
    // Инициализация обработчиков для уведомлений
    initNotifications();
});

/**
 * Инициализация функций работы с уведомлениями
 */
function initNotifications() {
    // Добавляем обработчики для кнопок "Прочитано" в уведомлениях
    document.querySelectorAll('.readNotification').forEach(button => {
        button.addEventListener('click', function() {
            const notificationId = this.dataset.notificationId;
            markNotificationAsRead(notificationId);
        });
    });
}

/**
 * Отмечает уведомление как прочитанное
 */
function markNotificationAsRead(notificationId) {
    fetch(`/dashboard/notifications/read/${notificationId}/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCsrfToken(),
            'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'include'
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(data => {
                throw new Error(data.message || 'Ошибка при отметке уведомления');
            });
        }
        return response.json();
    })
    .then(data => {
        console.log('Уведомление отмечено:', data);
        
        // Удаляем уведомление из DOM
        const notification = document.querySelector(`.notification-item[data-notification-id="${notificationId}"]`);
        if (notification) {
            notification.remove();
            
            // Проверяем, остались ли еще уведомления
            const container = document.getElementById('notifications-container');
            if (container && container.querySelectorAll('.notification-item').length === 0) {
                container.innerHTML = '<p class="notification-not-message">Нет новых уведомлений</p>';
            }
        }
    })
    .catch(error => {
        console.error('Ошибка:', error);
        showError(error.message || 'Не удалось отметить уведомление как прочитанное');
    });
}

// === РАБОТА С ИНТЕРФЕЙСОМ ===

/**
 * Инициализация вкладок на странице
 */
function initTabs() {
    // Основные вкладки страницы
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tabName = this.dataset.tab;
            
            // Убираем активный класс со всех кнопок и вкладок
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanes.forEach(pane => pane.classList.remove('active'));
            
            // Добавляем активный класс выбранной кнопке и вкладке
            this.classList.add('active');
            document.getElementById(tabName).classList.add('active');
            
            // Загружаем данные для выбранной вкладки
            loadTabContent(tabName);
        });
    });
    
    // Вложенные вкладки для запросов
    const requestTabButtons = document.querySelectorAll('.request-tab-btn');
    const requestTabPanes = document.querySelectorAll('.request-tab-pane');
    
    requestTabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tabName = this.dataset.tab;
            
            // Убираем активный класс со всех кнопок и вкладок
            requestTabButtons.forEach(btn => btn.classList.remove('active'));
            requestTabPanes.forEach(pane => pane.classList.remove('active'));
            
            // Добавляем активный класс выбранной кнопке и вкладке
            this.classList.add('active');
            document.getElementById(tabName).classList.add('active');
            
            // Загружаем данные для выбранной вкладки
            if (tabName === 'incoming') {
                loadIncomingRequests();
            } else if (tabName === 'outgoing') {
                loadOutgoingRequests();
            }
        });
    });
    
    // Вложенные вкладки для встреч
    const meetingTabButtons = document.querySelectorAll('.meeting-tab-btn');
    const meetingTabPanes = document.querySelectorAll('.meeting-tab-pane');
    
    meetingTabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tabName = this.dataset.tab;
            
            // Убираем активный класс со всех кнопок и вкладок
            meetingTabButtons.forEach(btn => btn.classList.remove('active'));
            meetingTabPanes.forEach(pane => pane.classList.remove('active'));
            
            // Добавляем активный класс выбранной кнопке и вкладке
            this.classList.add('active');
            document.getElementById(tabName).classList.add('active');
            
            // Загружаем данные для выбранной вкладки
            if (tabName === 'upcoming-meetings') {
                loadUpcomingMeetings();
            } else if (tabName === 'past-meetings') {
                loadPastMeetings();
            }
        });
    });
    
    // Обработчики для ссылок "Посмотреть все"
    document.querySelectorAll('.view-all').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const tabName = this.dataset.tab;
            document.querySelector(`.tab-btn[data-tab="${tabName}"]`).click();
        });
    });
}

/**
 * Загрузка контента для выбранной вкладки
 */
function loadTabContent(tabName) {
    switch (tabName) {
        case 'overview':
            loadOverviewData();
            break;
        case 'templates':
            loadTemplates();
            break;
        case 'availability':
            loadTemplateSelectOptions();
            break;
        case 'requests':
            // По умолчанию загружаем входящие запросы
            loadIncomingRequests();
            break;
        case 'meetings':
            // По умолчанию загружаем предстоящие встречи
            loadUpcomingMeetings();
            break;
    }
}

/**
 * Инициализация модальных окон
 */
function initModals() {
    // Получаем все модальные окна
    const modals = document.querySelectorAll('.modal');
    
    // Получаем все кнопки закрытия
    const closeButtons = document.querySelectorAll('.close, .cancel-btn');
    
    // Добавляем обработчик для кнопок закрытия
    closeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    });
    
    // Закрытие по клику вне модального окна
    window.addEventListener('click', function(event) {
        modals.forEach(modal => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
    
    // Настройка кнопки создания шаблона
    const createTemplateBtn = document.getElementById('createTemplateBtn');
    if (createTemplateBtn) {
        createTemplateBtn.addEventListener('click', function() {
            document.getElementById('createTemplateModal').style.display = 'block';
        });
    }
    
    // Инициализация модального окна добавления слота доступности
    const addAvailabilityModal = document.getElementById('addAvailabilityModal');
    if (addAvailabilityModal) {
        // Убедимся, что модальное окно скрыто при инициализации
        addAvailabilityModal.style.display = 'none';
        
        // Инициализация формы добавления слота
        const addAvailabilityForm = document.getElementById('addAvailabilityForm');
        if (addAvailabilityForm) {
            addAvailabilityForm.reset();
        }
    }
}

/**
 * Настройка обработчиков событий для форм
 */
function setupFormHandlers() {
    // Форма создания шаблона встречи
    const createTemplateForm = document.getElementById('createTemplateForm');
    if (createTemplateForm) {
        createTemplateForm.addEventListener('submit', function(e) {
            e.preventDefault();
            createTemplate();
        });
    }
    
    // Форма добавления слота доступности
    const addAvailabilityForm = document.getElementById('addAvailabilityForm');
    if (addAvailabilityForm) {
        console.log('Инициализация формы добавления слота доступности');
        addAvailabilityForm.addEventListener('submit', function(e) {
            e.preventDefault();
            console.log('Отправка формы добавления слота доступности');
            addAvailabilitySlot();
        });
    } else {
        console.error('Форма добавления слота доступности не найдена');
    }
    
    // Форма отправки приглашения
    const inviteForm = document.getElementById('inviteForm');
    if (inviteForm) {
        inviteForm.addEventListener('submit', function(e) {
            e.preventDefault();
            sendInvitation();
        });
    }
    
    // Форма добавления заметок
    const addNotesForm = document.getElementById('addNotesForm');
    if (addNotesForm) {
        addNotesForm.addEventListener('submit', function(e) {
            e.preventDefault();
            addNotesToMeeting();
        });
    }
    
    // Обработчик изменения выбранного шаблона в разделе доступности
    const availabilityTemplateSelect = document.getElementById('availabilityTemplate');
    if (availabilityTemplateSelect) {
        availabilityTemplateSelect.addEventListener('change', function() {
            if (this.value) {
                console.log('Выбран шаблон для расписания доступности:', this.value);
                loadAvailabilitySchedule(this.value);
            } else {
                document.getElementById('availabilitySchedule').innerHTML = '<div class="empty-list">Сначала выберите шаблон встречи</div>';
            }
        });
    }
}

// === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ДЛЯ ИНТЕРФЕЙСА ===

/**
 * Отображение сообщения об ошибке
 */
function showError(message) {
    // Проверяем сообщение и если оно о ненайденных шаблонах, выводим только в консоль
    if (message && (message.includes('шаблон') && message.includes('не найден'))) {
        console.log('Информация:', message);
        return;
    }
    
    // Для остальных ошибок показываем алерт
    alert(message); // В будущем можно заменить на более красивое уведомление
}

/**
 * Форматирование даты и времени
 */
function formatDateTime(dateTimeStr) {
    const date = new Date(dateTimeStr);
    return date.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).replace(',', '');
}

/**
 * Форматирование только даты
 */
function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

/**
 * Форматирование только времени
 */
function formatTime(dateTimeStr) {
    const date = new Date(dateTimeStr);
    return date.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Получение названия дня недели
 */
function getDayOfWeekName(dayNumber) {
    const days = [
        'Понедельник',
        'Вторник',
        'Среда',
        'Четверг',
        'Пятница',
        'Суббота',
        'Воскресенье'
    ];
    return days[dayNumber];
}

// === ЗАГРУЗКА ДАННЫХ С API ===

/**
 * Загрузка общих данных для страницы обзора
 */
function loadOverviewData() {
    // Загрузка статистики и карточек для вкладки обзора
    Promise.all([
        fetch('/api/personal-meetings/upcoming/'),
        fetch('/api/personal-meeting-requests/incoming/'),
        fetch('/api/personal-meeting-templates/')
    ])
    .then(responses => Promise.all(responses.map(response => response.json())))
    .then(([upcomingMeetingsData, incomingRequestsData, templatesData]) => {
        // Проверяем формат ответов API - если есть поле results, используем его
        const upcomingMeetings = upcomingMeetingsData.results ? upcomingMeetingsData.results : upcomingMeetingsData;
        const incomingRequests = incomingRequestsData.results ? incomingRequestsData.results : incomingRequestsData;
        const templates = templatesData.results ? templatesData.results : templatesData;
        
        console.log('Загружены данные для обзора:', { 
            upcomingMeetings, 
            incomingRequests, 
            templates 
        });
        
        // Обновление счетчиков
        document.getElementById('upcomingMeetingsCount').textContent = upcomingMeetings.length;
        
        // Фильтруем только ожидающие запросы
        const pendingRequests = incomingRequests.filter(request => request.status === 'PENDING');
        document.getElementById('pendingRequestsCount').textContent = pendingRequests.length;
        
        document.getElementById('templateCount').textContent = templates.length;
        
        // Отображение ближайших встреч в разделе обзора
        updateUpcomingMeetingsPreview(upcomingMeetings.slice(0, 3));
        
        // Отображение ожидающих запросов в разделе обзора
        updatePendingRequestsPreview(pendingRequests.slice(0, 3));
    })
    .catch(error => {
        console.error('Ошибка при загрузке данных для обзора:', error);
        showError('Не удалось загрузить данные для обзора. Пожалуйста, обновите страницу.');
    });
}

/**
 * Обновление превью ближайших встреч в разделе обзора
 */
function updateUpcomingMeetingsPreview(meetings) {
    const container = document.getElementById('upcomingMeetingsList');
    
    if (!meetings || meetings.length === 0) {
        container.innerHTML = '<div class="empty-list">У вас нет предстоящих встреч</div>';
        return;
    }
    
    container.innerHTML = '';
    
    meetings.forEach(meeting => {
        const meetingCard = document.createElement('div');
        meetingCard.className = 'meeting-card';
        
        // Определяем, является ли пользователь организатором встречи
        const isOrganizer = meeting.request.organizer.userId === currentUserId;
        
        meetingCard.innerHTML = `
            <span class="meeting-status scheduled">Запланирована</span>
            <h3>${meeting.request.template.title}</h3>
            <div class="meeting-details">
                <div><i class="fas fa-user"></i> ${isOrganizer ? 'С: ' + meeting.request.participant.firstName + ' ' + meeting.request.participant.lastName : 'Организатор: ' + meeting.request.organizer.firstName + ' ' + meeting.request.organizer.lastName}</div>
                <div><i class="far fa-calendar-alt"></i> ${formatDate(meeting.startTime)}</div>
                <div><i class="far fa-clock"></i> ${formatTime(meeting.startTime)} - ${formatTime(meeting.endTime)}</div>
                <div><i class="fas fa-map-marker-alt"></i> ${meeting.request.template.location || 'Не указано'}</div>
            </div>
        `;
        
        container.appendChild(meetingCard);
    });
}

/**
 * Обновление превью ожидающих запросов в разделе обзора
 */
function updatePendingRequestsPreview(requests) {
    const container = document.getElementById('pendingRequestsList');
    
    if (!requests || requests.length === 0) {
        container.innerHTML = '<div class="empty-list">У вас нет ожидающих запросов</div>';
        return;
    }
    
    container.innerHTML = '';
    
    requests.forEach(request => {
        const requestCard = document.createElement('div');
        requestCard.className = 'request-card';
        
        // Определяем, является ли пользователь организатором запроса
        const isOrganizer = request.organizer.userId === currentUserId;
        
        requestCard.innerHTML = `
            <span class="status pending">Ожидает подтверждения</span>
            <h3>${request.template.title}</h3>
            <div class="request-details">
                <div><i class="fas fa-user"></i> ${isOrganizer ? 'Для: ' + request.participant.firstName + ' ' + request.participant.lastName : 'От: ' + request.organizer.firstName + ' ' + request.organizer.lastName}</div>
                <div><i class="far fa-clock"></i> Длительность: ${request.template.duration} мин.</div>
                <div><i class="fas fa-map-marker-alt"></i> ${request.template.location || 'Не указано'}</div>
                <div><i class="far fa-calendar-alt"></i> Создан: ${formatDateTime(request.createdAt)}</div>
            </div>
            ${request.message ? `<div class="request-message"><i class="far fa-comment"></i> ${request.message}</div>` : ''}
        `;
        
        container.appendChild(requestCard);
    });
}

/**
 * Загрузка шаблонов встреч пользователя
 */
function loadTemplates() {
    fetch('/api/personal-meeting-templates/')
        .then(response => response.json())
        .then(data => {
            // Проверяем формат ответа API - если есть поле results, используем его
            const templates = data.results ? data.results : data;
            console.log('Загружены шаблоны:', templates);
            
            const container = document.getElementById('templatesList');
            
            if (!templates || templates.length === 0) {
                container.innerHTML = '<div class="empty-list">У вас пока нет шаблонов встреч</div>';
                return;
            }
            
            container.innerHTML = '';
            
            templates.forEach(template => {
                const templateCard = document.createElement('div');
                templateCard.className = 'template-card';
                
                templateCard.innerHTML = `
                    <span class="template-status ${template.isActive ? 'active' : 'inactive'}">
                        ${template.isActive ? 'Активен' : 'Неактивен'}
                    </span>
                    <h3>${template.title}</h3>
                    <p class="description">${template.description || 'Нет описания'}</p>
                    <div class="template-details">
                        <div><i class="far fa-clock"></i> ${template.duration} мин.</div>
                        <div><i class="fas fa-map-marker-alt"></i> ${template.location || 'Не указано'}</div>
                    </div>
                    <div class="template-actions">
                        <button class="btn-primary invite-btn" data-template-id="${template.templateId}">Пригласить</button>
                        <button class="btn-secondary schedule-btn" data-template-id="${template.templateId}">Расписание</button>
                        <button class="btn-secondary toggle-active-btn" data-template-id="${template.templateId}" data-is-active="${template.isActive}">
                            ${template.isActive ? 'Деактивировать' : 'Активировать'}
                        </button>
                        <button class="btn-danger delete-template-btn" data-template-id="${template.templateId}">Удалить</button>
                    </div>
                `;
                
                container.appendChild(templateCard);
            });
            
            // Добавляем обработчики событий для кнопок
            container.querySelectorAll('.invite-btn').forEach(button => {
                button.addEventListener('click', function() {
                    const templateId = this.dataset.templateId;
                    openInviteModal(templateId);
                });
            });
            
            container.querySelectorAll('.schedule-btn').forEach(button => {
                button.addEventListener('click', function() {
                    const templateId = this.dataset.templateId;
                    
                    // Переключаемся на вкладку расписания и выбираем нужный шаблон
                    document.querySelector('.tab-btn[data-tab="availability"]').click();
                    document.getElementById('availabilityTemplate').value = templateId;
                    loadAvailabilitySchedule(templateId);
                });
            });
            
            container.querySelectorAll('.toggle-active-btn').forEach(button => {
                button.addEventListener('click', function() {
                    const templateId = this.dataset.templateId;
                    toggleTemplateActive(templateId);
                });
            });
            
            container.querySelectorAll('.delete-template-btn').forEach(button => {
                button.addEventListener('click', function() {
                    const templateId = this.dataset.templateId;
                    deleteTemplate(templateId);
                });
            });
        })
        .catch(error => {
            console.error('Ошибка при загрузке шаблонов:', error);
            showError('Не удалось загрузить шаблоны встреч');
        });
}

// === ШАБЛОНЫ ВСТРЕЧ ===

/**
 * Создание нового шаблона встречи
 */
function createTemplate() {
    const title = document.getElementById('templateTitle').value.trim();
    const description = document.getElementById('templateDescription').value.trim();
    const duration = document.getElementById('templateDuration').value;
    const location = document.getElementById('templateLocation').value.trim();
    
    if (!title) {
        showError('Пожалуйста, укажите название шаблона встречи');
        return;
    }
    
    if (!duration || isNaN(duration) || duration < 15) {
        showError('Пожалуйста, укажите корректную длительность встречи (минимум 15 минут)');
        return;
    }
    
    console.log('Создание шаблона встречи:', {
        title,
        description,
        duration,
        location
    });
    
    fetch('/api/personal-meeting-templates/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCsrfToken()
        },
        body: JSON.stringify({
            title: title,
            description: description || null,
            duration: parseInt(duration),
            location: location || null,
            isActive: true
        })
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(data => {
                throw new Error(data.error || 'Ошибка при создании шаблона');
            });
        }
        return response.json();
    })
    .then(data => {
        console.log('Шаблон создан:', data);
        
        // Закрываем модальное окно и очищаем форму
        document.getElementById('createTemplateModal').style.display = 'none';
        document.getElementById('createTemplateForm').reset();
        
        // Обновляем список шаблонов и раздел обзора
        loadTemplates();
        loadOverviewData();
        
        // Обновляем выпадающий список шаблонов в разделе доступности
        loadTemplateSelectOptions();
        
        // Показываем уведомление об успешном создании
        alert('Шаблон встречи успешно создан');
    })
    .catch(error => {
        console.error('Ошибка:', error);
        showError(error.message || 'Не удалось создать шаблон встречи');
    });
}

/**
 * Переключение активности шаблона
 */
function toggleTemplateActive(templateId) {
    fetch(`/api/personal-meeting-templates/${templateId}/toggle_active/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCsrfToken()
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Ошибка при изменении статуса шаблона');
        }
        return response.json();
    })
    .then(data => {
        // Обновляем список шаблонов
        loadTemplates();
    })
    .catch(error => {
        console.error('Ошибка:', error);
        showError('Не удалось изменить статус шаблона');
    });
}

/**
 * Удаление шаблона встречи
 */
function deleteTemplate(templateId) {
    if (!confirm('Вы уверены, что хотите удалить этот шаблон встречи?')) {
        return;
    }
    
    fetch(`/api/personal-meeting-templates/${templateId}/`, {
        method: 'DELETE',
        headers: {
            'X-CSRFToken': getCsrfToken()
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Ошибка при удалении шаблона');
        }
        // Обновляем список шаблонов
        loadTemplates();
        loadOverviewData();
        
        // Обновляем список шаблонов в выпадающем списке раздела доступности
        loadTemplateSelectOptions();
    })
    .catch(error => {
        console.error('Ошибка:', error);
        showError('Не удалось удалить шаблон встречи');
    });
}

// === РАСПИСАНИЕ ДОСТУПНОСТИ ===

/**
 * Загрузка шаблонов для выпадающего списка в разделе доступности
 */
function loadTemplateSelectOptions() {
    fetch('/api/personal-meeting-templates/')
        .then(response => response.json())
        .then(data => {
            // Проверяем формат ответа API - если есть поле results, используем его
            const templates = data.results ? data.results : data;
            console.log('Загружены шаблоны для выпадающего списка:', templates);
            
            const select = document.getElementById('availabilityTemplate');
            select.innerHTML = '<option value="">Выберите шаблон встречи</option>';
            
            if (templates && templates.length > 0) {
                templates.forEach(template => {
                    if (template.isActive) {
                        const option = document.createElement('option');
                        option.value = template.templateId;
                        option.textContent = template.title;
                        select.appendChild(option);
                    }
                });
            }
        })
        .catch(error => {
            console.error('Ошибка при загрузке шаблонов для выпадающего списка:', error);
            showError('Не удалось загрузить список шаблонов');
        });
}

/**
 * Загрузка расписания доступности для выбранного шаблона
 */
function loadAvailabilitySchedule(templateId) {
    fetch(`/api/availability-schedules/?template=${templateId}`)
        .then(response => response.json())
        .then(data => {
            // Проверяем формат ответа API - если есть поле results, используем его
            const schedules = data.results ? data.results : data;
            console.log('Загружены слоты доступности:', schedules);
            
            const container = document.getElementById('availabilitySchedule');
            
            // Подготавливаем содержимое контейнера
            container.innerHTML = `
                <h3>Текущие слоты доступности</h3>
                <div class="availability-slots" id="availabilitySlots"></div>
                <button id="addSlotBtn" class="add-slot-btn" data-template-id="${templateId}">
                    <i class="fas fa-plus"></i> Добавить слот доступности
                </button>
            `;
            
            const slotsContainer = document.getElementById('availabilitySlots');
            
            if (!schedules || schedules.length === 0) {
                slotsContainer.innerHTML = '<div class="empty-list">Нет настроенных слотов доступности</div>';
            } else {
                // Сортируем расписание по дню недели и времени начала
                schedules.sort((a, b) => {
                    if (a.dayOfWeek !== b.dayOfWeek) {
                        return a.dayOfWeek - b.dayOfWeek;
                    }
                    return a.startTime.localeCompare(b.startTime);
                });
                
                // Отображаем слоты
                schedules.forEach(slot => {
                    const slotElement = document.createElement('div');
                    slotElement.className = 'availability-slot';
                    
                    slotElement.innerHTML = `
                        <div class="slot-info">
                            <span class="slot-day">${getDayOfWeekName(slot.dayOfWeek)}</span>
                            <span class="slot-time">${slot.startTime.slice(0, 5)} - ${slot.endTime.slice(0, 5)}</span>
                        </div>
                        <div class="slot-actions">
                            <button class="btn-danger delete-slot-btn" data-slot-id="${slot.scheduleId}">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    `;
                    
                    slotsContainer.appendChild(slotElement);
                });
                
                // Добавляем обработчики событий для кнопок удаления слотов
                slotsContainer.querySelectorAll('.delete-slot-btn').forEach(button => {
                    button.addEventListener('click', function() {
                        const slotId = this.dataset.slotId;
                        deleteAvailabilitySlot(slotId);
                    });
                });
            }
            
            // Добавляем обработчик для кнопки добавления слота
            document.getElementById('addSlotBtn').addEventListener('click', function() {
                // Сохраняем ID шаблона в форме добавления слота
                document.getElementById('templateIdForSlot').value = this.dataset.templateId;
                
                // Открываем модальное окно добавления слота
                document.getElementById('addAvailabilityModal').style.display = 'block';
            });
        })
        .catch(error => {
            console.error('Ошибка при загрузке расписания доступности:', error);
            showError('Не удалось загрузить расписание доступности');
        });
}

/**
 * Добавление нового слота доступности
 */
function addAvailabilitySlot() {
    const templateId = document.getElementById('templateIdForSlot').value;
    const dayOfWeek = document.getElementById('availabilityDay').value;
    const startTime = document.getElementById('availabilityStartTime').value;
    const endTime = document.getElementById('availabilityEndTime').value;
    
    console.log('Добавление слота доступности:', {
        templateId,
        dayOfWeek,
        startTime,
        endTime
    });
    
    // Проверка валидности времени
    if (startTime >= endTime) {
        showError('Время начала должно быть раньше времени окончания');
        return;
    }
    
    fetch('/api/availability-schedules/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCsrfToken()
        },
        body: JSON.stringify({
            template: templateId,
            dayOfWeek: parseInt(dayOfWeek),
            startTime: startTime,
            endTime: endTime
        })
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(data => {
                throw new Error(data.error || 'Ошибка при добавлении слота доступности');
            });
        }
        return response.json();
    })
    .then(data => {
        console.log('Слот доступности добавлен:', data);
        
        // Закрываем модальное окно и обновляем расписание
        document.getElementById('addAvailabilityModal').style.display = 'none';
        document.getElementById('addAvailabilityForm').reset();
        loadAvailabilitySchedule(templateId);
    })
    .catch(error => {
        console.error('Ошибка при добавлении слота доступности:', error);
        showError(error.message || 'Не удалось добавить слот доступности');
    });
}

/**
 * Удаление слота доступности
 */
function deleteAvailabilitySlot(slotId) {
    if (!confirm('Вы уверены, что хотите удалить этот слот доступности?')) {
        return;
    }
    
    fetch(`/api/availability-schedules/${slotId}/`, {
        method: 'DELETE',
        headers: {
            'X-CSRFToken': getCsrfToken()
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Ошибка при удалении слота доступности');
        }
        
        // Обновляем расписание для текущего шаблона
        const templateId = document.getElementById('availabilityTemplate').value;
        loadAvailabilitySchedule(templateId);
    })
    .catch(error => {
        console.error('Ошибка:', error);
        showError('Не удалось удалить слот доступности');
    });
}

// === ЗАПРОСЫ НА ВСТРЕЧИ ===

/**
 * Открытие модального окна для приглашения на встречу
 */
function openInviteModal(templateId) {
    const modal = document.getElementById('inviteModal');
    
    // Сохраняем ID шаблона в форме
    document.getElementById('templateIdForInvite').value = templateId;
    
    // Отображаем модальное окно
    modal.style.display = 'block';
}

/**
 * Отправка приглашения на встречу
 */
function sendInvitation() {
    const templateId = document.getElementById('templateIdForInvite').value;
    const inviteeEmail = document.getElementById('inviteeEmail').value;
    const message = document.getElementById('inviteMessage').value;
    
    fetch('/api/personal-meeting-requests/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCsrfToken()
        },
        body: JSON.stringify({
            template: templateId,
            invitee: inviteeEmail,
            message: message
        })
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(data => {
                throw new Error(data.error || JSON.stringify(data) || 'Ошибка при отправке приглашения');
            });
        }
        return response.json();
    })
    .then(data => {
        // Закрываем модальное окно и очищаем форму
        document.getElementById('inviteModal').style.display = 'none';
        document.getElementById('inviteForm').reset();
        
        // Обновляем списки запросов и раздел обзора
        loadOutgoingRequests();
        loadOverviewData();
        
        // Показываем сообщение об успешной отправке
        alert('Приглашение успешно отправлено!');
    })
    .catch(error => {
        console.error('Ошибка:', error);
        showError(error.message || 'Не удалось отправить приглашение');
    });
}

/**
 * Загрузка входящих запросов на встречи
 */
function loadIncomingRequests() {
    fetch('/api/personal-meeting-requests/incoming/')
        .then(response => response.json())
        .then(data => {
            // Проверяем формат ответа API - если есть поле results, используем его
            const requests = data.results ? data.results : data;
            console.log('Загружены входящие запросы:', requests);
            
            const container = document.getElementById('incomingRequestsList');
            
            if (!requests || requests.length === 0) {
                container.innerHTML = '<div class="empty-list">У вас нет входящих запросов на встречи</div>';
                return;
            }
            
            // Сортируем запросы: сначала ожидающие, затем по дате создания
            requests.sort((a, b) => {
                if (a.status === 'PENDING' && b.status !== 'PENDING') return -1;
                if (a.status !== 'PENDING' && b.status === 'PENDING') return 1;
                return new Date(b.createdAt) - new Date(a.createdAt);
            });
            
            container.innerHTML = '';
            
            requests.forEach(request => {
                const requestCard = document.createElement('div');
                requestCard.className = 'request-card';
                
                let statusText = '';
                let actionButtons = '';
                
                switch(request.status) {
                    case 'PENDING':
                        statusText = '<span class="status pending">Ожидает подтверждения</span>';
                        actionButtons = `
                            <button class="btn-primary choose-time-btn" data-request-id="${request.requestId}">Выбрать время</button>
                            <button class="btn-danger decline-request-btn" data-request-id="${request.requestId}">Отклонить</button>
                        `;
                        break;
                    case 'CONFIRMED':
                        statusText = '<span class="status confirmed">Подтверждено</span>';
                        break;
                    case 'DECLINED':
                        statusText = '<span class="status declined">Отклонено</span>';
                        break;
                    case 'CANCELED':
                        statusText = '<span class="status canceled">Отменено</span>';
                        break;
                }
                
                requestCard.innerHTML = `
                    ${statusText}
                    <h3>${request.template.title}</h3>
                    <div class="request-details">
                        <div><i class="fas fa-user"></i> От: ${request.organizer.firstName} ${request.organizer.lastName}</div>
                        <div><i class="far fa-clock"></i> Длительность: ${request.template.duration} мин.</div>
                        <div><i class="fas fa-map-marker-alt"></i> Место: ${request.template.location || 'Не указано'}</div>
                        <div><i class="far fa-calendar-alt"></i> Запрос создан: ${formatDateTime(request.createdAt)}</div>
                    </div>
                    ${request.message ? `<div class="request-message"><i class="far fa-comment"></i> ${request.message}</div>` : ''}
                    <div class="request-actions">
                        ${actionButtons}
                    </div>
                `;
                
                container.appendChild(requestCard);
            });
            
            // Добавляем обработчики событий для кнопок
            container.querySelectorAll('.choose-time-btn').forEach(button => {
                button.addEventListener('click', function() {
                    const requestId = this.dataset.requestId;
                    openChooseTimeModal(requestId);
                });
            });
            
            container.querySelectorAll('.decline-request-btn').forEach(button => {
                button.addEventListener('click', function() {
                    const requestId = this.dataset.requestId;
                    declineRequest(requestId);
                });
            });
        })
        .catch(error => {
            console.error('Ошибка при загрузке входящих запросов:', error);
            showError('Не удалось загрузить входящие запросы');
        });
}

/**
 * Загрузка исходящих запросов на встречи
 */
function loadOutgoingRequests() {
    fetch('/api/personal-meeting-requests/outgoing/')
        .then(response => response.json())
        .then(data => {
            // Проверяем формат ответа API - если есть поле results, используем его
            const requests = data.results ? data.results : data;
            console.log('Загружены исходящие запросы:', requests);
            
            const container = document.getElementById('outgoingRequestsList');
            
            if (!requests || requests.length === 0) {
                container.innerHTML = '<div class="empty-list">У вас нет исходящих запросов на встречи</div>';
                return;
            }
            
            // Сортируем запросы: сначала ожидающие, затем по дате создания
            requests.sort((a, b) => {
                if (a.status === 'PENDING' && b.status !== 'PENDING') return -1;
                if (a.status !== 'PENDING' && b.status === 'PENDING') return 1;
                return new Date(b.createdAt) - new Date(a.createdAt);
            });
            
            container.innerHTML = '';
            
            requests.forEach(request => {
                const requestCard = document.createElement('div');
                requestCard.className = 'request-card';
                
                let statusText = '';
                let actionButtons = '';
                
                switch(request.status) {
                    case 'PENDING':
                        statusText = '<span class="status pending">Ожидает подтверждения</span>';
                        actionButtons = `
                            <button class="btn-danger cancel-request-btn" data-request-id="${request.requestId}">Отменить</button>
                        `;
                        break;
                    case 'CONFIRMED':
                        statusText = '<span class="status confirmed">Подтверждено</span>';
                        break;
                    case 'DECLINED':
                        statusText = '<span class="status declined">Отклонено</span>';
                        break;
                    case 'CANCELED':
                        statusText = '<span class="status canceled">Отменено</span>';
                        break;
                }
                
                requestCard.innerHTML = `
                    ${statusText}
                    <h3>${request.template.title}</h3>
                    <div class="request-details">
                        <div><i class="fas fa-user"></i> Кому: ${request.invitee.firstName} ${request.invitee.lastName}</div>
                        <div><i class="far fa-clock"></i> Длительность: ${request.template.duration} мин.</div>
                        <div><i class="fas fa-map-marker-alt"></i> Место: ${request.template.location || 'Не указано'}</div>
                        <div><i class="far fa-calendar-alt"></i> Запрос создан: ${formatDateTime(request.createdAt)}</div>
                    </div>
                    ${request.message ? `<div class="request-message"><i class="far fa-comment"></i> ${request.message}</div>` : ''}
                    <div class="request-actions">
                        ${actionButtons}
                    </div>
                `;
                
                container.appendChild(requestCard);
            });
            
            // Добавляем обработчики событий для кнопок
            container.querySelectorAll('.cancel-request-btn').forEach(button => {
                button.addEventListener('click', function() {
                    const requestId = this.dataset.requestId;
                    cancelRequest(requestId);
                });
            });
        })
        .catch(error => {
            console.error('Ошибка при загрузке исходящих запросов:', error);
            showError('Не удалось загрузить исходящие запросы');
        });
}

/**
 * Отмена запроса на встречу
 */
function cancelRequest(requestId) {
    if (!confirm('Вы уверены, что хотите отменить этот запрос на встречу?')) {
        return;
    }
    
    fetch(`/api/personal-meeting-requests/${requestId}/cancel/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCsrfToken()
        }
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(data => {
                throw new Error(data.error || 'Ошибка при отмене запроса');
            });
        }
        return response.json();
    })
    .then(data => {
        console.log('Запрос отменен:', data);
        
        // Обновляем списки запросов и раздел обзора
        loadOutgoingRequests();
        loadOverviewData();
        
        // Показываем уведомление об успешной отмене
        alert('Запрос на встречу отменен');
    })
    .catch(error => {
        console.error('Ошибка:', error);
        showError(error.message || 'Не удалось отменить запрос на встречу');
    });
}

/**
 * Отклонение запроса на встречу
 */
function declineRequest(requestId) {
    if (!confirm('Вы уверены, что хотите отклонить этот запрос на встречу?')) {
        return;
    }
    
    fetch(`/api/personal-meeting-requests/${requestId}/decline/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCsrfToken()
        }
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(data => {
                throw new Error(data.error || 'Ошибка при отклонении запроса');
            });
        }
        return response.json();
    })
    .then(data => {
        console.log('Запрос отклонен:', data);
        
        // Обновляем списки запросов и раздел обзора
        loadIncomingRequests();
        loadOverviewData();
        
        // Показываем уведомление об успешном отклонении
        alert('Запрос на встречу отклонен');
    })
    .catch(error => {
        console.error('Ошибка:', error);
        showError(error.message || 'Не удалось отклонить запрос на встречу');
    });
}

// === ЛИЧНЫЕ ВСТРЕЧИ ===

/**
 * Загрузка предстоящих встреч
 */
function loadUpcomingMeetings() {
    fetch('/api/personal-meetings/upcoming/')
        .then(response => response.json())
        .then(data => {
            // Проверяем формат ответа API - если есть поле results, используем его
            const meetings = data.results ? data.results : data;
            console.log('Загружены предстоящие встречи:', meetings);
            
            const container = document.getElementById('upcomingMeetingsFullList');
            
            if (!meetings || meetings.length === 0) {
                container.innerHTML = '<div class="empty-list">У вас нет предстоящих встреч</div>';
                return;
            }
            
            // Сортируем встречи по дате начала
            meetings.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
            
            container.innerHTML = '';
            
            meetings.forEach(meeting => {
                const meetingCard = document.createElement('div');
                meetingCard.className = 'meeting-card';
                
                // Определяем, является ли пользователь организатором встречи
                const isOrganizer = meeting.request.organizer.userId === currentUserId;
                
                meetingCard.innerHTML = `
                    <span class="meeting-status scheduled">Запланирована</span>
                    <h3>${meeting.request.template.title}</h3>
                    <div class="meeting-details">
                        <div><i class="fas fa-user"></i> ${isOrganizer ? 'С: ' + meeting.request.participant.firstName + ' ' + meeting.request.participant.lastName : 'Организатор: ' + meeting.request.organizer.firstName + ' ' + meeting.request.organizer.lastName}</div>
                        <div><i class="far fa-calendar-alt"></i> ${formatDate(meeting.startTime)}</div>
                        <div><i class="far fa-clock"></i> ${formatTime(meeting.startTime)} - ${formatTime(meeting.endTime)}</div>
                        <div><i class="fas fa-map-marker-alt"></i> ${meeting.request.template.location || 'Не указано'}</div>
                    </div>
                    ${meeting.notes ? `<div class="meeting-notes"><i class="far fa-sticky-note"></i> ${meeting.notes}</div>` : ''}
                    <div class="meeting-actions">
                        <button class="btn-secondary add-notes-btn" data-meeting-id="${meeting.meetingId}">Добавить заметки</button>
                        <button class="btn-danger cancel-meeting-btn" data-meeting-id="${meeting.meetingId}">Отменить встречу</button>
                    </div>
                `;
                
                container.appendChild(meetingCard);
            });
            
            // Добавляем обработчики событий для кнопок
            container.querySelectorAll('.add-notes-btn').forEach(button => {
                button.addEventListener('click', function() {
                    const meetingId = this.dataset.meetingId;
                    openAddNotesModal(meetingId);
                });
            });
            
            container.querySelectorAll('.cancel-meeting-btn').forEach(button => {
                button.addEventListener('click', function() {
                    const meetingId = this.dataset.meetingId;
                    cancelMeeting(meetingId);
                });
            });
        })
        .catch(error => {
            console.error('Ошибка при загрузке предстоящих встреч:', error);
            showError('Не удалось загрузить предстоящие встречи');
        });
}

/**
 * Загрузка прошедших встреч
 */
function loadPastMeetings() {
    fetch('/api/personal-meetings/past/')
        .then(response => response.json())
        .then(data => {
            // Проверяем формат ответа API - если есть поле results, используем его
            const meetings = data.results ? data.results : data;
            console.log('Загружены прошедшие встречи:', meetings);
            
            const container = document.getElementById('pastMeetingsList');
            
            if (!meetings || meetings.length === 0) {
                container.innerHTML = '<div class="empty-list">У вас нет прошедших встреч</div>';
                return;
            }
            
            // Сортируем встречи по дате начала (от новых к старым)
            meetings.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
            
            container.innerHTML = '';
            
            meetings.forEach(meeting => {
                const meetingCard = document.createElement('div');
                meetingCard.className = 'meeting-card past';
                
                // Определяем, является ли пользователь организатором встречи
                console.log(meeting);
                const isOrganizer = meeting.request.organizer.userId === currentUserId;
                
                meetingCard.innerHTML = `
                    <span class="meeting-status completed">Завершена</span>
                    <h3>${meeting.request.template.title}</h3>
                    <div class="meeting-details">
                        <div><i class="fas fa-user"></i> ${isOrganizer ? 'С: ' + meeting.request.invitee.firstName + ' ' + meeting.request.invitee.lastName : 'Организатор: ' + meeting.request.organizer.firstName + ' ' + meeting.request.organizer.lastName}</div>
                        <div><i class="far fa-calendar-alt"></i> ${formatDate(meeting.startTime)}</div>
                        <div><i class="far fa-clock"></i> ${formatTime(meeting.startTime)} - ${formatTime(meeting.endTime)}</div>
                        <div><i class="fas fa-map-marker-alt"></i> ${meeting.request.template.location || 'Не указано'}</div>
                    </div>
                    ${meeting.notes ? `<div class="meeting-notes"><i class="far fa-sticky-note"></i> ${meeting.notes}</div>` : ''}
                    <div class="meeting-actions">
                        <button class="btn-secondary add-notes-btn" data-meeting-id="${meeting.meetingId}">Добавить заметки</button>
                    </div>
                `;
                
                container.appendChild(meetingCard);
            });
            
            // Добавляем обработчики событий для кнопок
            container.querySelectorAll('.add-notes-btn').forEach(button => {
                button.addEventListener('click', function() {
                    const meetingId = this.dataset.meetingId;
                    openAddNotesModal(meetingId);
                });
            });
        })
        .catch(error => {
            console.error('Ошибка при загрузке прошедших встреч:', error);
            showError('Не удалось загрузить прошедшие встречи');
        });
}

/**
 * Отмена встречи
 */
function cancelMeeting(meetingId) {
    if (!confirm('Вы уверены, что хотите отменить эту встречу?')) {
        return;
    }
    
    fetch(`/api/personal-meetings/${meetingId}/cancel/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCsrfToken()
        }
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(data => {
                throw new Error(data.error || 'Ошибка при отмене встречи');
            });
        }
        return response.json();
    })
    .then(data => {
        console.log('Встреча отменена:', data);
        
        // Обновляем списки встреч и раздел обзора
        loadUpcomingMeetings();
        loadOverviewData();
        
        // Показываем уведомление об успешной отмене
        alert('Встреча успешно отменена');
    })
    .catch(error => {
        console.error('Ошибка:', error);
        showError(error.message || 'Не удалось отменить встречу');
    });
}

// === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===

/**
 * Получение CSRF-токена из cookies
 */
function getCsrfToken() {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            // Ищем cookie с именем csrftoken
            if (cookie.substring(0, 10) === 'csrftoken=') {
                cookieValue = decodeURIComponent(cookie.substring(10));
                break;
            }
        }
    }
    return cookieValue;
}

// === МОДАЛЬНЫЕ ОКНА И ДЕЙСТВИЯ ПОЛЬЗОВАТЕЛЯ ===

/**
 * Открытие модального окна для выбора времени встречи
 */
function openChooseTimeModal(requestId) {
    const modal = document.getElementById('chooseTimeModal');
    const meetingInfoContainer = document.getElementById('meetingInfo');
    const availableSlotsContainer = document.getElementById('availableTimeSlots');
    
    // Отображаем модальное окно
    modal.style.display = 'block';
    
    // Отображаем индикатор загрузки
    availableSlotsContainer.innerHTML = '<div class="loading">Загрузка доступных слотов...</div>';
    
    // Загружаем информацию о запросе и доступные слоты
    fetch(`/api/personal-meeting-requests/${requestId}/`)
        .then(response => response.json())
        .then(request => {
            console.log('Загружен запрос:', request);
            
            // Отображаем информацию о запросе
            meetingInfoContainer.innerHTML = `
                <h3>${request.template.title}</h3>
                <div class="meeting-details">
                    <div><i class="fas fa-user"></i> От: ${request.organizer.firstName} ${request.organizer.lastName}</div>
                    <div><i class="far fa-clock"></i> Длительность: ${request.template.duration} мин.</div>
                    <div><i class="fas fa-map-marker-alt"></i> ${request.template.location || 'Не указано'}</div>
                </div>
                ${request.message ? `<div class="request-message"><i class="far fa-comment"></i> ${request.message}</div>` : ''}
            `;
            
            // Загружаем доступные слоты
            return fetch(`/api/personal-meeting-requests/${requestId}/available_slots/`);
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(data.error || 'Ошибка при загрузке доступных слотов');
                });
            }
            return response.json();
        })
        .then(slots => {
            console.log('Загружены доступные слоты:', slots);
            
            if (!slots || slots.length === 0) {
                availableSlotsContainer.innerHTML = '<div class="empty-list">Нет доступных слотов для этого запроса</div>';
                return;
            }
            
            // Группируем слоты по датам
            const slotsByDate = {};
            slots.forEach(slot => {
                if (!slotsByDate[slot.formattedDate]) {
                    slotsByDate[slot.formattedDate] = [];
                }
                slotsByDate[slot.formattedDate].push(slot);
            });
            
            // Отображаем слоты
            availableSlotsContainer.innerHTML = '';
            
            Object.keys(slotsByDate).forEach(date => {
                const dateContainer = document.createElement('div');
                dateContainer.className = 'date-container';
                dateContainer.innerHTML = `<h4 class="date-header">${date}</h4>`;
                
                const slotsContainer = document.createElement('div');
                slotsContainer.className = 'date-slots';
                
                slotsByDate[date].forEach(slot => {
                    const slotElement = document.createElement('div');
                    slotElement.className = 'time-slot';
                    slotElement.innerHTML = `${slot.startTime} - ${slot.endTime}`;
                    slotElement.dataset.start = slot.start;
                    slotElement.dataset.end = slot.end;
                    
                    slotElement.addEventListener('click', function() {
                        // Снимаем выделение со всех слотов
                        document.querySelectorAll('.time-slot').forEach(el => {
                            el.classList.remove('selected');
                        });
                        
                        // Выделяем выбранный слот
                        this.classList.add('selected');
                        
                        // Активируем кнопку подтверждения
                        document.getElementById('confirmTimeBtn').disabled = false;
                    });
                    
                    slotsContainer.appendChild(slotElement);
                });
                
                dateContainer.appendChild(slotsContainer);
                availableSlotsContainer.appendChild(dateContainer);
            });
            
            // Настраиваем кнопку подтверждения
            const confirmBtn = document.getElementById('confirmTimeBtn');
            confirmBtn.disabled = true;
            confirmBtn.onclick = function() {
                const selectedSlot = document.querySelector('.time-slot.selected');
                if (!selectedSlot) {
                    showError('Пожалуйста, выберите время для встречи');
                    return;
                }
                
                confirmMeetingTime(requestId, selectedSlot.dataset.start, selectedSlot.dataset.end);
            };
        })
        .catch(error => {
            console.error('Ошибка:', error);
            availableSlotsContainer.innerHTML = `<div class="error-message">Ошибка: ${error.message}</div>`;
        });
}

/**
 * Подтверждение времени встречи
 */
function confirmMeetingTime(requestId, startTime, endTime) {
    fetch('/api/personal-meetings/confirm/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCsrfToken()
        },
        body: JSON.stringify({
            request_id: requestId,
            start_time: startTime,
            end_time: endTime
        })
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(data => {
                throw new Error(data.error || 'Ошибка при подтверждении времени встречи');
            });
        }
        return response.json();
    })
    .then(data => {
        console.log('Время встречи подтверждено:', data);
        
        // Закрываем модальное окно
        document.getElementById('chooseTimeModal').style.display = 'none';
        
        // Обновляем данные на странице
        loadIncomingRequests();
        loadUpcomingMeetings();
        loadOverviewData();
        
        // Показываем уведомление об успешном подтверждении
        alert('Встреча успешно запланирована!');
    })
    .catch(error => {
        console.error('Ошибка:', error);
        showError(error.message || 'Не удалось подтвердить время встречи');
    });
}

/**
 * Открытие модального окна для добавления заметок к встрече
 */
function openAddNotesModal(meetingId) {
    const modal = document.getElementById('addNotesModal');
    
    // Сохраняем ID встречи в форме
    document.getElementById('meetingIdForNotes').value = meetingId;
    
    // Получаем текущие заметки для встречи
    fetch(`/api/personal-meetings/${meetingId}/`)
        .then(response => response.json())
        .then(meeting => {
            console.log('Загружены данные встречи:', meeting);
            
            // Если есть заметки, отображаем их в поле ввода
            if (meeting.notes) {
                document.getElementById('meetingNotes').value = meeting.notes;
            } else {
                document.getElementById('meetingNotes').value = '';
            }
            
            // Отображаем модальное окно
            modal.style.display = 'block';
        })
        .catch(error => {
            console.error('Ошибка при загрузке данных встречи:', error);
            showError('Не удалось загрузить данные встречи');
        });
}

/**
 * Добавление заметок к встрече
 */
function addNotesToMeeting() {
    const meetingId = document.getElementById('meetingIdForNotes').value;
    const notes = document.getElementById('meetingNotes').value.trim();
    
    if (!notes) {
        showError('Пожалуйста, введите текст заметок');
        return;
    }
    
    fetch(`/api/personal-meetings/${meetingId}/`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCsrfToken()
        },
        body: JSON.stringify({
            notes: notes
        })
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(data => {
                throw new Error(data.error || 'Ошибка при добавлении заметок');
            });
        }
        return response.json();
    })
    .then(data => {
        console.log('Заметки добавлены:', data);
        
        // Закрываем модальное окно
        document.getElementById('addNotesModal').style.display = 'none';
        
        // Обновляем списки встреч
        loadUpcomingMeetings();
        loadPastMeetings();
        
        // Показываем уведомление об успешном добавлении заметок
        alert('Заметки успешно добавлены');
    })
    .catch(error => {
        console.error('Ошибка:', error);
        showError(error.message || 'Не удалось добавить заметки');
    });
}
