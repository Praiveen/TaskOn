
import { SubDepartmentManager } from './subDepartmentManager.js';

class DepartmentManager {
    constructor() {

        this.csrfToken = this.getCookie('csrftoken');
        if (!this.csrfToken) {
            const csrfElement = document.querySelector('[name=csrfmiddlewaretoken]');
            if (csrfElement) {
                this.csrfToken = csrfElement.value;
            }
        }

        this.form = document.getElementById('createDepartmentForm');
        this.departmentHeadSelect = document.getElementById('departmentHead');
        this.departmentsContainer = document.querySelector('.departments-container');
        this.users = [];

        this.modal = document.getElementById('modalWindow');
        this.modalTitle = this.modal.querySelector('.modal-title');
        this.modalBody = this.modal.querySelector('.modal-body');
        this.closeModalBtn = this.modal.querySelector('.close-modal');

        this.searchableSelect = null;
        this.subDepartmentManager = null;

        this.initialize();
        this.setupModalEvents();
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

    async initialize() {
        await this.loadUsers();
        await this.loadDepartments();
        this.setupEventListeners();
    }

    async loadUsers() {
        try {
            const response = await fetch('/department/users/', {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRFToken': this.csrfToken
                }
            });

            if (!response.ok) throw new Error('Ошибка загрузки пользователей');

            this.users = await response.json();
            this.updateUsersList(this.users);
        } catch (error) {
            console.error('Error loading users:', error);
        }
    }

    updateUsersList(users) {
        this.departmentHeadSelect.innerHTML = '<option value="">Выберите руководителя</option>';
        users.forEach(user => {
            const option = document.createElement('option');
            option.value = user.userId;
            option.textContent = `${user.firstName} ${user.lastName}`;
            this.departmentHeadSelect.appendChild(option);
        });
    }

    async loadDepartments() {
        try {
            const response = await fetch('/department/list/', {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRFToken': this.csrfToken
                }
            });

            if (!response.ok) throw new Error('Ошибка загрузки отделов');

            const departments = await response.json();
            this.renderDepartments(departments);
        } catch (error) {
            console.error('Error loading departments:', error);
            this.departmentsContainer.innerHTML = '<p class="error">Ошибка загрузки отделов</p>';
        }
    }

    renderDepartments(departments) {
        this.departmentsContainer.innerHTML = departments.length ? '' :
            '<div class="no-departments">Отделы пока не созданы</div>';

        departments.forEach(department => {
            const departmentElement = document.createElement('div');
            departmentElement.className = 'department-card';
            departmentElement.innerHTML = `
                <div class="department-header">
                    <h4 class="department-name">${department.name}</h4>
                    <div class="department-actions">
                        <button class="btn-manage-employees" data-id="${department.id}" title="Управление сотрудниками">
                            <i class="fas fa-users"></i>
                        </button>
                        <button class="btn-subdepartments" data-id="${department.id}">
                            <i class="fas fa-sitemap"></i>
                        </button>
                        <button class="btn-edit" data-id="${department.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-delete" data-id="${department.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="department-info">
                    <div class="manager-info">
                        <span class="label">Руководитель:</span>
                        <span class="value">${department.managerName}</span>
                    </div>
                    <div class="employees-count">
                        <span class="label">Сотрудников:</span>
                        <span class="value">${department.employeesCount}</span>
                    </div>
                </div>
            `;

            const subdepartmentsBtn = departmentElement.querySelector('.btn-subdepartments');
            const editBtn = departmentElement.querySelector('.btn-edit');
            const deleteBtn = departmentElement.querySelector('.btn-delete');

            const manageEmployeesBtn = departmentElement.querySelector('.btn-manage-employees');
            manageEmployeesBtn.addEventListener('click', () => {
                const employeesBlock = document.querySelector('.department-employees-block');
                if (employeesBlock.style.display === 'block') {
                    employeesBlock.style.display = 'none';
                    window.employeeManager.setCurrentDepartment(null);
                } else {
                    employeesBlock.style.display = 'block';
                    window.employeeManager.setCurrentDepartment(department.id);
                }
            });

            subdepartmentsBtn.addEventListener('click', () => this.showSubDepartments(department.id));
            editBtn.addEventListener('click', () => this.editDepartment(department.id));
            deleteBtn.addEventListener('click', () => this.deleteDepartment(department.id));

            this.departmentsContainer.appendChild(departmentElement);
        });
    }

    setupEventListeners() {
        this.form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = {
                departmentName: this.form.querySelector('#departmentName').value,
                headId: parseInt(this.departmentHeadSelect.value)
            };

            try {
                const response = await fetch('/department/create/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': this.csrfToken,
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    body: JSON.stringify(formData)
                });

                if (response.ok) {
                    this.form.reset();
                    await this.loadDepartments();
                    await this.loadUsers();
                } else {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Ошибка создания отдела');
                }
            } catch (error) {
                console.error('Error creating department:', error);
                alert(error.message || 'Произошла ошибка при создании отдела');
            }
        });
    }

    showSubDepartments(departmentId) {
        const createSubdepartmentBlock = document.querySelector('.create-subdepartment-block');
        const subdepartmentsListBlock = document.querySelector('.subdepartments-list-block');

        if (this.subDepartmentManager && this.subDepartmentManager.parentDepartmentId === departmentId) {
            createSubdepartmentBlock.style.display = 'none';
            subdepartmentsListBlock.style.display = 'none';
            this.subDepartmentManager.destroy();
            this.subDepartmentManager = null;
            return;
        }

        createSubdepartmentBlock.style.display = 'block';
        subdepartmentsListBlock.style.display = 'block';

        if (this.subDepartmentManager) {
            this.subDepartmentManager.destroy();
        }

        this.subDepartmentManager = new SubDepartmentManager(departmentId);
    }

    async editDepartment(departmentId) {
        try {
            const response = await fetch(`/department/${departmentId}/`, {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRFToken': this.csrfToken
                }
            });

            if (!response.ok) throw new Error('Ошибка загрузки данных отдела');

            const department = await response.json();


            if (!this.users.length) {
                await this.loadUsers();
            }

            const formHtml = `
                <form id="editDepartmentForm" class="department-form">
                    <input type="hidden" id="editDepartmentId" value="${department.id}">
                    <div class="form-group">
                        <label for="editDepartmentName">Название отдела:</label>
                        <input 
                            type="text" 
                            id="editDepartmentName" 
                            name="departmentName" 
                            value="${department.name}"
                            required 
                            class="form-input"
                        >
                    </div>
                    <div class="form-group">
                        <label for="editDepartmentHead">Руководитель отдела:</label>
                        <select 
                            id="editDepartmentHead" 
                            name="departmentHead" 
                            required 
                            class="form-select"
                        >
                            <option value="">Выберите руководителя</option>
                            ${this.generateUserOptions(this.users, department.managerId)}
                        </select>
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="btn-primary">
                            <i class="fas fa-save"></i> Сохранить
                        </button>
                    </div>
                </form>
            `;


            this.modalTitle.textContent = 'Редактирование отдела';
            this.modalBody.innerHTML = formHtml;


            const form = this.modalBody.querySelector('#editDepartmentForm');
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.updateDepartment();
            });

            this.openModal();
        } catch (error) {
            console.error('Ошибка при загрузке данных отдела:', error);
            alert('Не удалось загрузить данные отдела');
        }
    }

    generateUserOptions(users, selectedUserId) {
        return users.map(user => `
            <option 
                value="${user.userId}" 
                ${user.userId == selectedUserId ? 'selected' : ''}
            >
                ${user.firstName} ${user.lastName}
            </option>
        `).join('');
    }

    async updateDepartment() {
        const departmentId = document.getElementById('editDepartmentId').value;
        const departmentData = {
            departmentName: document.getElementById('editDepartmentName').value,
            headId: document.getElementById('editDepartmentHead').value
        };

        try {
            const response = await fetch(`/department/update/${departmentId}/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.csrfToken,
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify(departmentData)
            });

            if (response.ok) {
                await this.loadDepartments();
                this.closeModal();
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Ошибка обновления отдела');
            }
        } catch (error) {
            console.error('Ошибка при обновлении отдела:', error);
            alert('Произошла ошибка при обновлении отдела');
        }
    }

    openModal() {
        this.modal.classList.add('show');
    }

    closeModal() {
        this.modal.classList.remove('show');
        this.modalBody.innerHTML = '';
        this.modalTitle.textContent = '';
    }

    setupModalEvents() {
        this.closeModalBtn.addEventListener('click', () => this.closeModal());
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.closeModal();
        });
    }

    async deleteDepartment(departmentId) {
        if (confirm('Вы уверены, что хотите удалить этот отдел?')) {
            try {
                const response = await fetch(`/department/delete/${departmentId}/`, {
                    method: 'POST',
                    headers: {
                        'X-CSRFToken': this.csrfToken,
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                });

                if (response.ok) {
                    await this.loadDepartments();
                    await this.loadUsers();
                } else {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Ошибка удаления отдела');
                }
            } catch (error) {
                console.error('Ошибка при удалении отдела:', error);
                alert('Произошла ошибка при удалении отдела');
            }
        }
    }
}


export default DepartmentManager;