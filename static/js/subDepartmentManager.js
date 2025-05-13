import { createSearchableSelect } from './searchInSelection.js';

export class SubDepartmentManager {
    constructor(parentDepartmentId = null) {
        console.log('SubDepartmentManager constructor called');
        
        // Получение CSRF-токена
        const csrftoken = document.querySelector('[name=csrfmiddlewaretoken]');
        if (csrftoken) {
            this.csrfToken = csrftoken.value;
            console.log('CSRF token found in input element:', this.csrfToken.substring(0, 5) + '...');
        } else {
            // Получение из cookie
        this.csrfToken = this.getCookie('csrftoken');
            if (this.csrfToken) {
                console.log('CSRF token found in cookie:', this.csrfToken.substring(0, 5) + '...');
            } else {
                // Поиск в форме csrf-form
                const csrfForm = document.getElementById('csrf-form');
                if (csrfForm) {
                    const csrfElement = csrfForm.querySelector('[name=csrfmiddlewaretoken]');
            if (csrfElement) {
                this.csrfToken = csrfElement.value;
                        console.log('CSRF token found in csrf-form:', this.csrfToken.substring(0, 5) + '...');
                    }
                }
            }
        }
        
        if (!this.csrfToken) {
            console.error('CSRF Token not found! Form submissions will fail.');
        } else {
            console.log('Final CSRF Token:', this.csrfToken.substring(0, 5) + '...');
        }
        
        this.parentDepartmentId = parentDepartmentId;
        this.form = document.getElementById('createSubDepartmentForm');
        this.subDepartmentHeadSelect = document.getElementById('subDepartmentHead');
        this.subdepartmentsContainer = document.querySelector('.subdepartments-container');
        this.users = [];
        this.submitHandler = null;

        if (window.userRoles && window.userRoles.includes('DEPARTMENT_MANAGER')) {
            this.loadManagerDepartment();
        } else if (parentDepartmentId) {
        this.initialize();
        }
    }
    
    // Метод для получения CSRF-токена из cookie для Django
    getCookie(name) {
        console.log('Getting CSRF token...');
        
        // Сначала пытаемся получить токен из cookies
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    console.log(`Found CSRF token in cookie: ${cookieValue.substring(0, 5)}...`);
                    break;
                }
            }
        }
        
        // Если не нашли в cookies, ищем в meta-теге
        if (!cookieValue) {
            const csrfMeta = document.querySelector('meta[name="csrf-token"]');
            if (csrfMeta) {
                cookieValue = csrfMeta.getAttribute('content');
                console.log(`Found CSRF token in meta tag: ${cookieValue.substring(0, 5)}...`);
            }
        }
        
        // Если и там нет, ищем в форме
        if (!cookieValue) {
            const csrfElement = document.querySelector('input[name="csrfmiddlewaretoken"]');
            if (csrfElement) {
                cookieValue = csrfElement.value;
                console.log(`Found CSRF token in form: ${cookieValue.substring(0, 5)}...`);
            }
        }
        
        // Финальная проверка
        if (!cookieValue) {
            console.error('CSRF token not found!');
        }
        
        return cookieValue;
    }

    setupForDirector() {
        console.log('Setting up for Director');
        const createBlock = document.querySelector('.create-subdepartment-block');
        const listBlock = document.querySelector('.subdepartments-list-block');
        if (createBlock) createBlock.style.display = 'none';
        if (listBlock) listBlock.style.display = 'none';
    }

    setupForDepartmentManager() {
        console.log('Setting up for Department Manager');
        const createBlock = document.querySelector('.create-subdepartment-block');
        const listBlock = document.querySelector('.subdepartments-list-block');
        if (createBlock) createBlock.style.display = 'block';
        if (listBlock) listBlock.style.display = 'block';

        this.loadManagerDepartment();
    }

    toggleSubDepartmentBlocks() {
        const createBlock = document.querySelector('.create-subdepartment-block');
        const listBlock = document.querySelector('.subdepartments-list-block');
        if (createBlock) createBlock.style.display = createBlock.style.display === 'none' ? 'block' : 'none';
        if (listBlock) listBlock.style.display = listBlock.style.display === 'none' ? 'block' : 'none';
    }

    async loadManagerDepartment() {
        try {
            const response = await fetch('/dashboard/current-user-department/', {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRFToken': this.csrfToken
                }
            });
            if (!response.ok) throw new Error('Ошибка при загрузке информации об отделе');
            const department = await response.json();
            this.parentDepartmentId = department.id;
            
            const createBlock = document.querySelector('.create-subdepartment-block');
            const listBlock = document.querySelector('.subdepartments-list-block');
            if (createBlock) createBlock.style.display = 'block';
            if (listBlock) listBlock.style.display = 'block';
            
            await this.initialize();
        } catch (error) {
            console.error('Ошибка при загрузке информации об отделе:', error);
        }
    }

    async initialize() {
        await this.loadUsers();
        await this.loadSubDepartments();
        
        // Добавляем скрытое поле для CSRF токена в форму, если его нет
        const csrfInputInForm = this.form.querySelector('[name="csrfmiddlewaretoken"]');
        if (!csrfInputInForm && this.csrfToken) {
            const csrfInput = document.createElement('input');
            csrfInput.type = 'hidden';
            csrfInput.name = 'csrfmiddlewaretoken';
            csrfInput.value = this.csrfToken;
            this.form.appendChild(csrfInput);
            console.log('Added CSRF token to form:', this.csrfToken.substring(0, 5) + '...');
        }
        
        this.setupEventListeners();
    }

    setupSearchableSelect() {
        if (this.searchableSelect) {
            const oldWrapper = this.subDepartmentHeadSelect.nextElementSibling;
            if (oldWrapper && oldWrapper.classList.contains('custom-select-wrapper')) {
                oldWrapper.remove();
            }
        }
    
        this.searchableSelect = createSearchableSelect(
            this.subDepartmentHeadSelect,
            this.users,
            {
                getDisplayText: (user) => `${user.firstName} ${user.lastName}`,
                getValue: (user) => user.userId,
                placeholder: 'Выберите руководителя подотдела',
                searchPlaceholder: 'Поиск сотрудника...'
            }
        );
    }

    async loadUsers() {
        try {
            const url = `/dashboard/departments/${this.parentDepartmentId}/available-managers/`;
            console.log(`Fetching users from URL: ${url}`);
            const response = await fetch(url, {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRFToken': this.csrfToken
                }
            });
            if (!response.ok) {
                console.error(`Error status: ${response.status} (${response.statusText})`);
                const errorText = await response.text();
                console.error(`Error response: ${errorText}`);
                throw new Error(`Ошибка при загрузке пользователей: ${response.status}`);
            }
            this.users = await response.json();
            console.log(`Successfully loaded ${this.users.length} users`);
            this.updateUsersList(this.users);
    
            if (this.searchableSelect) {
                this.searchableSelect.update(this.users);
            }
        } catch (error) {
            console.error('Ошибка при загрузке пользователей:', error);
        }
    }

    updateUsersList(users) {
        this.subDepartmentHeadSelect.innerHTML = '<option value="">Выберите руководителя</option>';
        users.forEach(user => {
            const option = document.createElement('option');
            option.value = user.userId;
            option.textContent = `${user.firstName} ${user.lastName}`;
            this.subDepartmentHeadSelect.appendChild(option);
        });
    }

    async loadSubDepartments() {
        try {
            const url = `/dashboard/departments/${this.parentDepartmentId}/subdepartments/`;
            console.log(`Fetching subdepartments from URL: ${url}`);
            const response = await fetch(url, {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRFToken': this.csrfToken
                }
            });
            if (!response.ok) {
                console.error(`Error status: ${response.status} (${response.statusText})`);
                const errorText = await response.text();
                console.error(`Error response: ${errorText}`);
                throw new Error(`Ошибка при загрузке подотделов: ${response.status}`);
            }
            
            const subdepartments = await response.json();
            console.log(`Successfully loaded ${subdepartments.length} subdepartments`);
            this.renderSubDepartments(subdepartments);
        } catch (error) {
            console.error('Ошибка при загрузке подотделов:', error);
            this.subdepartmentsContainer.innerHTML = '<div class="error-message">Ошибка при загрузке подотделов</div>';
        }
    }

    setupEventListeners() {
        this.submitHandler = async (e) => {
            e.preventDefault();
            
            const headId = this.subDepartmentHeadSelect.value;
            console.log('Form submission - headId:', headId);
            
            if (!headId || headId === '') {
                console.log('No head selected');
                alert('Пожалуйста, выберите руководителя подотдела');
                return;
            }
            
            if (!this.csrfToken) {
                console.error('CSRF token is missing!');
                alert('Ошибка CSRF-защиты. Пожалуйста, обновите страницу и попробуйте снова.');
            return;
        }
        
            console.log('Submitting form directly');
            
            // Прямая отправка формы вместо AJAX
            const form = document.getElementById('createSubDepartmentForm');
            
            // Создаем скрытые поля для данных
            let subdeptNameInput = form.querySelector('input[name="subdepartmentName"]');
            if (!subdeptNameInput) {
                subdeptNameInput = document.getElementById('subdepartmentName');
            }
            
            let headIdInput = form.querySelector('input[name="headId"]');
            if (!headIdInput) {
                headIdInput = document.createElement('input');
                headIdInput.type = 'hidden';
                headIdInput.name = 'headId';
                form.appendChild(headIdInput);
            }
            headIdInput.value = headId;
            
            let deptIdInput = form.querySelector('input[name="departmentId"]');
            if (!deptIdInput) {
                deptIdInput = document.createElement('input');
                deptIdInput.type = 'hidden';
                deptIdInput.name = 'departmentId';
                form.appendChild(deptIdInput);
            }
            deptIdInput.value = this.parentDepartmentId;
            
            // Убедимся, что есть CSRF токен
            let csrfInput = form.querySelector('input[name="csrfmiddlewaretoken"]');
            if (!csrfInput) {
                csrfInput = document.createElement('input');
                csrfInput.type = 'hidden';
                csrfInput.name = 'csrfmiddlewaretoken';
                csrfInput.value = this.csrfToken;
                form.appendChild(csrfInput);
            } else {
                csrfInput.value = this.csrfToken;
            }
            
            console.log('Form action:', form.action);
            console.log('Form method:', form.method);
            console.log('CSRF token in form:', csrfInput.value.substring(0, 5) + '...');
            
            // Устанавливаем атрибуты формы
            form.action = '/dashboard/departments/subdepartments/create/';
            form.method = 'POST';
            
            // Устанавливаем обработчик для формы
            const originalAction = form.action;
            const originalMethod = form.method;
            
            try {
                // Используем XMLHttpRequest для отправки формы
                const xhr = new XMLHttpRequest();
                xhr.open('POST', '/dashboard/departments/subdepartments/create/');
                xhr.setRequestHeader('X-CSRFToken', this.csrfToken);
                xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
                
                // Собираем данные формы
                const formData = new FormData(form);
                
                // Устанавливаем обработчик
                xhr.onload = async () => {
                    console.log('XHR status:', xhr.status);
                    
                    if (xhr.status === 200) {
                        alert('Подотдел успешно создан');
                        
                        await this.loadUsers();
                        if (window.departmentManager) {
                            await window.departmentManager.loadUsers();
                        }
                        
                        await this.loadSubDepartments();
                        form.reset();
                        
                        if (this.searchableSelect) {
                            this.searchableSelect.setValue('', 'Выберите руководителя');
                        }
                    } else {
                        console.error('Server error:', xhr.responseText);
                        
                        if (xhr.status === 403 && xhr.responseText.includes('CSRF')) {
                            alert('Ошибка CSRF-защиты. Пожалуйста, обновите страницу и попробуйте снова.');
                        } else {
                            alert(`Ошибка при создании подотдела: ${xhr.responseText}`);
                        }
                    }
                };
                
                xhr.onerror = () => {
                    console.error('XHR error');
                    alert('Произошла ошибка при отправке запроса');
                };
                
                // Отправляем запрос
                xhr.send(formData);
            } catch (error) {
                console.error('Error submitting form:', error);
                alert('Произошла ошибка при создании подотдела');
                
                // Восстанавливаем оригинальные значения
                form.action = originalAction;
                form.method = originalMethod;
            }
        };
        
        this.form.addEventListener('submit', this.submitHandler);
    }

    renderSubDepartments(subdepartments) {
        this.subdepartmentsContainer.innerHTML = subdepartments.length ? '' :
            '<div class="no-subdepartments">Подотделы пока не созданы</div>';

        subdepartments.forEach(subdepartment => {
            const subdepartmentElement = document.createElement('div');
            subdepartmentElement.className = 'department-card';
            subdepartmentElement.innerHTML = `
                <div class="department-header">
                    <h4 class="department-name">${subdepartment.name}</h4>
                    <div class="department-actions">
                        <button class="btn-manage-employees" data-id="${subdepartment.id}" title="Управление сотрудниками">
                            <i class="fas fa-users"></i>
                        </button>
                        <button class="btn-edit" data-id="${subdepartment.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                        <button class="btn-delete" data-id="${subdepartment.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                    </div>
                </div>
                <div class="department-info">
                    <div class="manager-info">
                        <span class="label">Руководитель:</span>
                        <span class="value">${subdepartment.managerName}</span>
                    </div>
                    <div class="employees-count">
                        <span class="label">Сотрудников:</span>
                        <span class="value">${subdepartment.employeesCount}</span>
                    </div>
                </div>
            `;
            
            const editBtn = subdepartmentElement.querySelector('.btn-edit');
            const deleteBtn = subdepartmentElement.querySelector('.btn-delete');
            const manageEmployeesBtn = subdepartmentElement.querySelector('.btn-manage-employees');
            
            manageEmployeesBtn.addEventListener('click', () => {
                const employeesBlock = document.querySelector('.subdepartment-employees-block');
                if (employeesBlock.style.display === 'block') {
                    employeesBlock.style.display = 'none';
                    window.employeeManager.setCurrentSubdepartment(null);
                } else {
                    employeesBlock.style.display = 'block';
                    window.employeeManager.setCurrentSubdepartment(subdepartment.id);
                }
            });

            editBtn.addEventListener('click', () => this.editSubDepartment(subdepartment.id));
            deleteBtn.addEventListener('click', () => this.deleteSubDepartment(subdepartment.id));

            this.subdepartmentsContainer.appendChild(subdepartmentElement);
        });
    }

    async editSubDepartment(subdepartmentId) {
        try {
            // Проверяем наличие CSRF-токена перед отправкой запроса
            if (!this.csrfToken) {
                console.error('CSRF token is missing! Attempting to get a new token...');
                this.csrfToken = this.getCookie('csrftoken');
                
                if (!this.csrfToken) {
                    const csrfForm = document.getElementById('csrf-form');
                    if (csrfForm) {
                        const csrfElement = csrfForm.querySelector('[name=csrfmiddlewaretoken]');
                        if (csrfElement) {
                            this.csrfToken = csrfElement.value;
                        }
                    }
                }
                
                if (!this.csrfToken) {
                    alert('Ошибка CSRF-защиты. Пожалуйста, обновите страницу и попробуйте снова.');
                    return;
                }
            }
            
            const [subdepartmentResponse, usersResponse] = await Promise.all([
                fetch(`/dashboard/departments/subdepartments/${subdepartmentId}/`, {
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-CSRFToken': this.csrfToken
                    }
                }),
                fetch('/dashboard/company/users/', {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRFToken': this.csrfToken
                    }
                })
            ]);
    
            const subdepartment = await subdepartmentResponse.json();
            const users = await usersResponse.json();
            const modal = document.getElementById('modalWindow');
            const modalTitle = modal.querySelector('.modal-title');
            const modalBody = modal.querySelector('.modal-body');

            modalTitle.textContent = 'Редактирование подотдела';
            modalBody.innerHTML = `
                <form id="editSubDepartmentForm" class="edit-form">
                    <input type="hidden" id="editSubDepartmentId" value="${subdepartmentId}">
                    <input type="hidden" name="csrfmiddlewaretoken" value="${this.csrfToken}">
                    <div class="form-group">
                        <label for="editSubDepartmentName">Название подотдела:</label>
                        <input type="text" id="editSubDepartmentName" class="form-control" 
                               value="${subdepartment.name}" required>
                    </div>
                    <div class="form-group">
                        <label for="editSubDepartmentHead">Руководитель подотдела:</label>
                        <select id="editSubDepartmentHead" class="form-select" required>
                            <option value="">Выберите руководителя</option>
                        </select>
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">Сохранить</button>
                    </div>
                </form>
            `;
            const editSelect = modalBody.querySelector('#editSubDepartmentHead');
            createSearchableSelect(
                editSelect,
                users,
                {
                    getDisplayText: (user) => `${user.firstName} ${user.lastName}`,
                    getValue: (user) => user.userId,
                    placeholder: 'Выберите руководителя',
                    searchPlaceholder: 'Поиск сотрудника...'
                }
            );
            editSelect.value = subdepartment.managerId;
            const selectWrapper = editSelect.nextElementSibling;
            if (selectWrapper) {
                const selectedValue = selectWrapper.querySelector('.selected-value');
                if (selectedValue) {
                    selectedValue.textContent = subdepartment.managerName;
                }
            }
            const form = modalBody.querySelector('#editSubDepartmentForm');
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                console.log('Form submitted');
                const updatedData = {
                    subdepartmentName: document.getElementById('editSubDepartmentName').value,
                    headId: parseInt(document.getElementById('editSubDepartmentHead').value),
                departmentId: this.parentDepartmentId
            };
            
            try {
                    console.log('Updating subdepartment with ID:', subdepartmentId);
                    console.log('CSRF token:', this.csrfToken ? this.csrfToken.substring(0, 5) + '...' : 'Missing');
                    
                    const response = await fetch(`/dashboard/departments/subdepartments/update/${subdepartmentId}/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': this.csrfToken,
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                        body: JSON.stringify(updatedData)
                });

                    console.log('Update response status:', response.status);

                if (response.ok) {
                        await this.loadSubDepartments();
                        await this.loadUsers();
                        if (window.departmentManager) {
                            await window.departmentManager.loadUsers();
                        }
                        modal.classList.remove('show');
                        modalBody.innerHTML = '';
                    } else {
                        const responseText = await response.text();
                        console.error('Server error:', responseText);
                        
                        // Проверяем, связана ли ошибка с CSRF
                        if (response.status === 403 && responseText.includes('CSRF')) {
                            alert('Ошибка CSRF-защиты. Пожалуйста, обновите страницу и попробуйте снова.');
                } else {
                            alert(`Ошибка при обновлении подотдела: ${responseText}`);
                        }
                }
            } catch (error) {
                    console.error('Ошибка при обновлении подотдела:', error);
                    alert('Произошла ошибка при обновлении подотдела');
                }
            });
            modal.classList.add('show');
    
        } catch (error) {
            console.error('Ошибка при загрузке данных подотдела:', error);
            alert('Не удалось загрузить данные подотдела');
        }
    }

    async deleteSubDepartment(subdepartmentId) {
        if (confirm('Вы уверены, что хотите удалить этот подотдел?')) {
            try {
                // Проверяем наличие CSRF-токена перед отправкой запроса
                if (!this.csrfToken) {
                    console.error('CSRF token is missing! Attempting to get a new token...');
                    this.csrfToken = this.getCookie('csrftoken');
                    
                    if (!this.csrfToken) {
                        const csrfForm = document.getElementById('csrf-form');
                        if (csrfForm) {
                            const csrfElement = csrfForm.querySelector('[name=csrfmiddlewaretoken]');
                            if (csrfElement) {
                                this.csrfToken = csrfElement.value;
                            }
                        }
                    }
                    
                    if (!this.csrfToken) {
                        alert('Ошибка CSRF-защиты. Пожалуйста, обновите страницу и попробуйте снова.');
                        return;
                    }
                }
                
                console.log('Deleting subdepartment with ID:', subdepartmentId);
                console.log('CSRF token:', this.csrfToken ? this.csrfToken.substring(0, 5) + '...' : 'Missing');
                
                const response = await fetch(`/dashboard/departments/subdepartments/delete/${subdepartmentId}/`, {
                    method: 'POST',
                    headers: {
                        'X-CSRFToken': this.csrfToken,
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                });

                console.log('Delete response status:', response.status);

                if (response.ok) {
                    await this.loadSubDepartments();
                    await this.loadUsers();
                } else {
                    const responseText = await response.text();
                    console.error('Server error:', responseText);
                    
                    // Проверяем, связана ли ошибка с CSRF
                    if (response.status === 403 && responseText.includes('CSRF')) {
                        alert('Ошибка CSRF-защиты. Пожалуйста, обновите страницу и попробуйте снова.');
                    } else {
                        alert(`Ошибка при удалении подотдела: ${responseText}`);
                    }
                }
            } catch (error) {
                console.error('Ошибка при удалении подотдела:', error);
                alert('Произошла ошибка при удалении подотдела');
            }
        }
    }

    destroy() {
        document.querySelector('.create-subdepartment-block').style.display = 'none';
        document.querySelector('.subdepartments-list-block').style.display = 'none';
        
        this.subdepartmentsContainer.innerHTML = '';
        
        const subDepartmentSelectParent = this.subDepartmentHeadSelect.parentElement;
        
        const selectWrappers = subDepartmentSelectParent.querySelectorAll('.custom-select-wrapper');
        selectWrappers.forEach(wrapper => {
            if (wrapper.parentElement) {
                wrapper.parentElement.removeChild(wrapper);
            }
        });
        
        if (this.subDepartmentHeadSelect) {
            this.subDepartmentHeadSelect.style.display = '';
            this.subDepartmentHeadSelect.innerHTML = '<option value="">Выберите руководителя</option>';
        }
        
        if (this.searchableSelect) {
            this.searchableSelect = null;
        }
        
        if (this.form && this.submitHandler) {
            this.form.removeEventListener('submit', this.submitHandler);
        }
    }
}

export default SubDepartmentManager;

// В конце файла не добавляем автоматическую инициализацию, она происходит через import в dashboard.html
// и в DepartmentManager.js