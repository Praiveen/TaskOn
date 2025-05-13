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
    
    
    if (selectedMode !== 'personal' && selectedMode !== 'corporate' && selectedMode !== 'both') {
        console.error("Выбран некорректный режим:", selectedMode);
        return;
    }
    
    
    document.querySelectorAll('.mode-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    
    document.getElementById(mode + '-mode').classList.add('selected');
    
    
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
    
    
    const csrftoken = document.querySelector('input[name="csrfmiddlewaretoken"]').value;
    
    
    const modeMapping = {
        'personal': 'PERSONAL',
        'corporate': 'CORPORATE',
        'both': 'BOTH'
    };
    
    
    const modeToSend = modeMapping[selectedMode];
    
    
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
        
        if (selectedMode === 'personal') {
            
            window.location.href = '/personal-meetings/';
        } else if (selectedMode === 'corporate' || selectedMode === 'both') {
            
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


document.addEventListener('DOMContentLoaded', function() {
    
    const sendRequestBtn = document.getElementById('sendRequestBtn');
    if (sendRequestBtn) {
        sendRequestBtn.addEventListener('click', function() {
            this.clicked = true;
        });
    }
    
    
    const createCompanyBtn = document.getElementById('createCompanyBtn');
    if (createCompanyBtn) {
        createCompanyBtn.addEventListener('click', function() {
            this.clicked = true;
        });
    }
}); 