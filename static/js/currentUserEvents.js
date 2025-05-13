class CurrentUserEvents {
    constructor() {

        this.csrfToken = this.getCookie('csrftoken');
        if (!this.csrfToken) {
            const csrfElement = document.querySelector('[name=csrfmiddlewaretoken]');
            if (csrfElement) {
                this.csrfToken = csrfElement.value;
            }
        }

        this.loadUserEvents();
        this.initializeEventListeners();
    }

    getCookie(name) {
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

    initializeEventListeners() {
        document.addEventListener('click', async (e) => {
            if (e.target.classList.contains('btn-delete-event')) {
                const eventId = e.target.dataset.eventId;
                if (confirm('Вы уверены, что хотите удалить это событие?')) {
                    await this.deleteEvent(eventId);
                }
            }

            if (e.target.classList.contains('btn-complete-event')) {
                const eventId = e.target.dataset.eventId;
                if (confirm('Вы уверены, что хотите завершить это событие?')) {
                    await this.completeEvent(eventId);
                }
            }
        });
    }

    async loadUserEvents() {
        try {
            const response = await fetch('/event/user-events/', {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRFToken': this.csrfToken
                },
                credentials: 'same-origin'
            });

            if (!response.ok) throw new Error('Ошибка загрузки событий');

            const events = await response.json();
            this.renderEvents(events);

            this.updateCalendarEvents(events);
        } catch (error) {
            console.error('Error loading events:', error);
        }
    }

    updateCalendarEvents(events) {
        window.calendarTasks = window.calendarTasks || {};
        const calendarTasks = window.calendarTasks;


        if (events.currentEvents && events.currentEvents.length > 0) {
            events.currentEvents.forEach(event => {
                if (!event.startTime) return;

                const date = new Date(event.startTime);
                const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

                if (!calendarTasks[dateKey]) {
                    calendarTasks[dateKey] = [];
                }

                calendarTasks[dateKey].push({
                    title: event.title,
                    type: 'event'
                });
            });
        }

        if (window.refreshCalendar) {
            window.refreshCalendar();
        }
    }

    renderEvents(events) {
        const currentEventsContainer = document.querySelector('.current-events');
        const pastEventsContainer = document.querySelector('.past-events');

        if (currentEventsContainer) {
            if (!events.currentEvents || events.currentEvents.length === 0) {
                currentEventsContainer.innerHTML = '<p>Нет активных событий</p>';
            } else {
                currentEventsContainer.innerHTML = events.currentEvents.map(event => `
                    <div class="event-card ${event.isCreator ? 'creator-event' : ''}">
                        <h3>${event.title || 'Без названия'}</h3>
                        <p>${event.description || 'Нет описания'}</p>
                        <div class="event-details">
                            <span>
                                <i class="fas fa-calendar"></i>
                                ${this.formatDate(event.startTime)}
                            </span>
                            <span>
                                <i class="fas fa-clock"></i>
                                ${this.formatTime(event.startTime)} - ${this.formatTime(event.endTime)}
                            </span>
                        </div>
                        
                        <div class="event-status ${this.getStatusClass(event.status)}">${this.getStatusText(event.status)}</div>
                        <div class="event-creator">
                            <i class="fas fa-user"></i>
                            ${event.isCreator ? 'Вы создатель' : `Создал: ${event.createdBy || 'Неизвестно'}`}
                        </div>
                        ${event.isCreator || event.can_edit ? `
                            <div class="creator-actions">
                                <button class="btn-complete-event" data-event-id="${event.eventId}">
                                    <i class="fas fa-check"></i> Завершить
                                </button>
                                <button class="btn-delete-event" data-event-id="${event.eventId}">
                                    <i class="fas fa-trash"></i> Удалить
                                </button>
                            </div>
                        ` : ''}
                    </div>
                `).join('');
            }
        }

        if (pastEventsContainer) {
            if (!events.pastEvents || events.pastEvents.length === 0) {
                pastEventsContainer.innerHTML = '<p>Нет прошедших событий</p>';
            } else {
                pastEventsContainer.innerHTML = events.pastEvents.map(event => `
                    <div class="event-card past">
                        <h3>${event.title || 'Без названия'}</h3>
                        <p>${event.description || 'Нет описания'}</p>
                        <div class="event-details">
                            <span>
                                <i class="fas fa-calendar"></i>
                                ${this.formatDate(event.startTime)}
                            </span>
                            <span>
                                <i class="fas fa-clock"></i>
                                ${this.formatTime(event.startTime)} - ${this.formatTime(event.endTime)}
                            </span>
                        </div>
                        <div class="event-status ${this.getStatusClass(event.status)}">${this.getStatusText(event.status)}</div>
                        <div class="event-creator">
                            <i class="fas fa-user"></i>
                            ${event.isCreator ? 'Вы создатель' : `Создал: ${event.createdBy || 'Неизвестно'}`}
                        </div>
                    </div>
                `).join('');
            }
        }
    }

    getStatusClass(status) {
        if (!status) return '';

        const statusMap = {
            'PLANNED': 'planned',
            'COMPLETED': 'completed',
            'CANCELLED': 'cancelled',
            'planned': 'planned',
            'completed': 'completed',
            'cancelled': 'cancelled'
        };

        return statusMap[status] || status.toLowerCase();
    }

    getStatusText(status) {
        if (!status) return 'Неизвестно';

        const statusMap = {
            'PLANNED': 'Запланировано',
            'COMPLETED': 'Завершено',
            'CANCELLED': 'Отменено',
            'planned': 'Запланировано',
            'completed': 'Завершено',
            'cancelled': 'Отменено'
        };

        return statusMap[status] || status;
    }

    formatDate(dateString) {
        if (!dateString) return 'Не указано';

        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Некорректная дата';

        return date.toLocaleDateString('ru-RU');
    }

    formatTime(dateString) {
        if (!dateString) return 'Не указано';

        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Некорректное время';

        return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    }

    async deleteEvent(eventId) {
        try {
            const response = await fetch(`/event/delete-event/${eventId}/`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': this.csrfToken,
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Ошибка при удалении события');
            }

            this.loadUserEvents();
        } catch (error) {
            console.error('Error deleting event:', error);
            alert('Ошибка при удалении события: ' + error.message);
        }
    }

    async completeEvent(eventId) {
        try {
            const response = await fetch(`/event/complete-event/${eventId}/`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': this.csrfToken,
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Ошибка при завершении события');
            }

            this.loadUserEvents();
        } catch (error) {
            console.error('Error completing event:', error);
            alert('Ошибка при завершении события: ' + error.message);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const currentUserEvents = new CurrentUserEvents();
});