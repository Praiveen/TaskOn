document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('createCompanyForm');
    
    if (form) {
        form.addEventListener('submit', function(event) {
            event.preventDefault();
            
            const companyName = document.getElementById('companyName').value;
            const address = document.getElementById('address').value;
            const csrfToken = form.querySelector('[name=csrfmiddlewaretoken]').value;

            if (!companyName || !address) {
                alert('Пожалуйста, заполните все поля.');
                return;
            }

            const companyData = {
                companyName: companyName,
                address: address
            };

            fetch('/dashboard/starter/createCompany/newcompany/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken
                },
                body: JSON.stringify(companyData)
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(data => {
                        throw new Error(data.error || 'Ошибка при создании компании');
                    });
                }
                return response.json();
            })
            .then(data => {
                console.log('Компания успешно создана:', data);
                window.location.href = '/dashboard/';
            })
            .catch(error => {
                console.error('Ошибка:', error);
                alert(error.message || 'Произошла ошибка при создании компании');
            });
        });
    }
});