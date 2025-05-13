document.addEventListener('DOMContentLoaded', function () {

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
    const jwtToken = getCookie('jwtToken');

    loadCompanies();

    function loadCompanies() {

        const headers = {
            'X-Requested-With': 'XMLHttpRequest'
        };


        if (jwtToken) {
            headers['Authorization'] = `Bearer ${jwtToken}`;
        }

        fetch('/dashboard/companies/', {
            headers: headers,
            credentials: 'include'
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Ошибка загрузки компаний');
                }
                return response.json();
            })
            .then(companies => {
                const select = document.getElementById('companySelect');
                if (!select) return;

                select.innerHTML = '<option value="" disabled selected>Выберите компанию</option>';

                if (companies && companies.length > 0) {
                    companies.forEach(company => {
                        const option = document.createElement('option');
                        option.value = company.id || company.companyId;
                        option.textContent = company.name || company.companyName;
                        select.appendChild(option);
                    });
                } else {
                    const option = document.createElement('option');
                    option.disabled = true;
                    option.textContent = 'Нет доступных компаний';
                    select.appendChild(option);
                }
            })
            .catch(error => {
                console.error('Ошибка при загрузке компаний:', error);
            });
    }


    window.sendRequest = function () {
        const companySelect = document.getElementById('companySelect');
        const selectedCompanyId = companySelect.value;

        if (!selectedCompanyId) {
            alert('Пожалуйста, выберите компанию');
            return;
        }


        const headers = {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken,
            'X-Requested-With': 'XMLHttpRequest'
        };


        if (jwtToken) {
            headers['Authorization'] = `Bearer ${jwtToken}`;
        }

        fetch('/dashboard/companies/request/', {
            method: 'POST',
            headers: headers,
            credentials: 'include',
            body: JSON.stringify({
                companyId: selectedCompanyId,
                message: "Запрос на присоединение к компании"
            })
        })
            .then(async response => {
                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.error || 'Ошибка при отправке заявки');
                }
                return response.json();
            })
            .then(data => {
                alert(data.message || 'Заявка успешно отправлена');
            })
            .catch(error => {
                console.error('Ошибка при отправке заявки:', error);
                alert(error.message || 'Произошла ошибка при отправке заявки');
            });
    };
});