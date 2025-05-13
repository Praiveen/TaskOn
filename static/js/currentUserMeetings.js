class CurrentUserMeetings {
    constructor() {

        this.csrfToken = this.getCookie('csrftoken');
        if (!this.csrfToken) {
            const csrfElement = document.querySelector('[name=csrfmiddlewaretoken]');
            if (csrfElement) {
                this.csrfToken = csrfElement.value;
            }
        }

        this.loadUserMeetings();
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
            if (e.target.classList.contains('btn-delete-meeting')) {
                const meetingId = e.target.dataset.meetingId;
                if (confirm('Вы уверены, что хотите удалить это мероприятие?')) {
                    await this.deleteMeeting(meetingId);
                }
            }
            if (e.target.classList.contains('btn-complete-meeting')) {
                const meetingId = e.target.dataset.meetingId;
                if (confirm('Вы уверены, что хотите завершить это мероприятие?')) {
                    await this.completeMeeting(meetingId);
                }
            }
        });
    }

    async deleteMeeting(meetingId) {
        try {
            const response = await fetch(`/event/delete-meeting/${meetingId}/`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': this.csrfToken,
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Ошибка при удалении встречи');
            }

            this.loadUserMeetings();
        } catch (error) {
            console.error('Error deleting meeting:', error);
            alert('Ошибка при удалении встречи: ' + error.message);
        }
    }

    async completeMeeting(meetingId) {
        try {
            const response = await fetch(`/event/complete-meeting/${meetingId}/`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': this.csrfToken,
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Ошибка при завершении встречи');
            }

            this.loadUserMeetings();
        } catch (error) {
            console.error('Error completing meeting:', error);
            alert('Ошибка при завершении встречи: ' + error.message);
        }
    }

    async loadUserMeetings() {
        try {
            const response = await fetch('/event/user-meetings/', {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRFToken': this.csrfToken
                },
                credentials: 'same-origin'
            });

            if (!response.ok) throw new Error('Ошибка загрузки встреч');

            const events = await response.json();
            console.log('Loaded meetings:', events);
            this.renderMeetings(events);

            this.updateCalendarMeetings(events);
        } catch (error) {
            console.error('Error loading meetings:', error);
        }
    }

    updateCalendarMeetings(events) {
        window.calendarTasks = window.calendarTasks || {};
        const calendarTasks = window.calendarTasks;

        if (events.currentMeetings && events.currentMeetings.length > 0) {
            events.currentMeetings.forEach(event => {
                if (!event.startTime) return;

                const date = new Date(event.startTime);
                const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

                if (!calendarTasks[dateKey]) {
                    calendarTasks[dateKey] = [];
                }

                calendarTasks[dateKey].push({
                    title: event.topic || event.title,
                    type: 'meeting'
                });
            });
        }

        if (window.refreshCalendar) {
            window.refreshCalendar();
        }
    }

    renderMeetings(events) {
        console.log('Rendering meetings:', events);

        const currentEventsContainer = document.querySelector('.current-meetings');
        const pastEventsContainer = document.querySelector('.past-meetings');

        if (!currentEventsContainer || !pastEventsContainer) {
            console.error('Containers not found:', {
                current: currentEventsContainer,
                past: pastEventsContainer
            });
            return;
        }

        if (currentEventsContainer) {
            if (!events.currentMeetings || events.currentMeetings.length === 0) {
                currentEventsContainer.innerHTML = '<p>Нет активных встреч</p>';
            } else {
                currentEventsContainer.innerHTML = events.currentMeetings.map(meeting => `
                    <div class="event-card ${meeting.isOrganizer ? 'organizer-meeting' : ''}">
                        <h3>${meeting.topic || meeting.title || 'Без названия'}</h3>
                        <p>${meeting.agenda || meeting.description || 'Нет описания'}</p>
                        <div class="event-details">
                            <span><i class="fas fa-calendar"></i> ${this.formatDate(meeting.startTime)}</span>
                            <span><i class="fas fa-clock"></i> ${this.formatTime(meeting.startTime)} - ${this.formatTime(meeting.endTime)}</span>
                            <span><i class='fas fa-map-marker-alt'></i> ${meeting.location || 'Место не указано'}</span>
                        </div>
                        <div class="event-status ${this.getStatusClass(meeting.status)}">${this.getStatusText(meeting.status)}</div>
                        <div class="event-creator">
                            <i class="fas fa-user"></i>
                            ${meeting.isOrganizer ? 'Вы организатор' : `Организатор: ${meeting.organizer || meeting.createdBy || 'Неизвестно'}`}
                        </div>
                        ${meeting.isOrganizer || meeting.can_edit ? `
                            <div class="organizer-actions">
                                <button class="btn-complete-meeting" data-meeting-id="${meeting.meetingId}">
                                    <i class="fas fa-check"></i> Завершить
                                </button>
                                <button class="btn-delete-meeting" data-meeting-id="${meeting.meetingId}">
                                    <i class="fas fa-trash"></i> Удалить
                                </button>
                            </div>
                        ` : ''}
                    </div>
                `).join('');
            }
        }

        if (pastEventsContainer) {
            if (!events.pastMeetings || events.pastMeetings.length === 0) {
                pastEventsContainer.innerHTML = '<p>Нет прошедших встреч</p>';
            } else {
                pastEventsContainer.innerHTML = events.pastMeetings.map(meeting => `
                    <div class="event-card past">
                        <h3>${meeting.topic || meeting.title || 'Без названия'}</h3>
                        <p>${meeting.agenda || meeting.description || 'Нет описания'}</p>
                        <div class="event-details">
                            <span><i class="fas fa-calendar"></i> ${this.formatDate(meeting.startTime)}</span>
                            <span><i class="fas fa-clock"></i> ${this.formatTime(meeting.startTime)} - ${this.formatTime(meeting.endTime)}</span>
                            <span><i class='fas fa-map-marker-alt'></i> ${meeting.location || 'Место не указано'}</span>
                        </div>
                        <div class="event-status ${this.getStatusClass(meeting.status)}">${this.getStatusText(meeting.status)}</div>
                        <div class="event-creator">
                            <i class="fas fa-user"></i>
                            ${meeting.isOrganizer ? 'Вы организатор' : `Организатор: ${meeting.organizer || meeting.createdBy || 'Неизвестно'}`}
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
}

document.addEventListener('DOMContentLoaded', () => {
    const currentUserMeetings = new CurrentUserMeetings();
});