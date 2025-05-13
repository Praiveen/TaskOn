/**
 * Создает расширенный выпадающий список с возможностью поиска
 * @param {HTMLSelectElement} selectElement - Исходный элемент select, который нужно заменить
 * @param {Array} items - Массив элементов для выбора
 * @param {Object} options - Дополнительные опции
 * @param {Function} options.getDisplayText - Функция для получения отображаемого текста элемента
 * @param {Function} options.getValue - Функция для получения значения элемента
 * @param {string} options.placeholder - Текст подсказки при отсутствии выбранного элемента
 * @param {string} options.searchPlaceholder - Текст подсказки в поле поиска
 * @returns {Object} - Объект управления созданным выпадающим списком
 */
export function createSearchableSelect(selectElement, items, options = {}) {
    // Значения по умолчанию
    const defaults = {
        getDisplayText: item => item.toString(),
        getValue: item => item,
        placeholder: 'Выберите...',
        searchPlaceholder: 'Поиск...'
    };
    
    const settings = { ...defaults, ...options };
    
    // Скрываем оригинальный select
    selectElement.style.display = 'none';
    
    // Создаем обертку для нового элемента
    const wrapper = document.createElement('div');
    wrapper.className = 'custom-select-wrapper';
    
    // Создаем элемент отображения выбранного значения
    const selectedDisplay = document.createElement('div');
    selectedDisplay.className = 'selected-value';
    selectedDisplay.textContent = settings.placeholder;
    
    // Кнопка для открытия/закрытия выпадающего списка
    const toggleButton = document.createElement('span');
    toggleButton.className = 'toggle-dropdown';
    toggleButton.innerHTML = '<i class="fas fa-chevron-down"></i>';
    
    // Контейнер для выбранного значения и кнопки
    const selectedContainer = document.createElement('div');
    selectedContainer.className = 'selected-container';
    selectedContainer.appendChild(selectedDisplay);
    selectedContainer.appendChild(toggleButton);
    
    // Добавляем контейнер в обертку
    wrapper.appendChild(selectedContainer);
    
    // Создаем выпадающий список
    const dropdown = document.createElement('div');
    dropdown.className = 'dropdown-container';
    
    // Создаем поле поиска
    const searchBox = document.createElement('input');
    searchBox.type = 'text';
    searchBox.className = 'search-box';
    searchBox.placeholder = settings.searchPlaceholder;
    
    // Добавляем поле поиска в выпадающий список
    dropdown.appendChild(searchBox);
    
    // Создаем список элементов
    const optionsList = document.createElement('div');
    optionsList.className = 'options-list';
    
    // Добавляем список в выпадающий список
    dropdown.appendChild(optionsList);
    
    // Добавляем выпадающий список в обертку
    wrapper.appendChild(dropdown);
    
    // Добавляем обертку после оригинального select
    selectElement.parentNode.insertBefore(wrapper, selectElement.nextSibling);
    
    // Заполняем список элементами
    function renderOptions(filterText = '') {
        optionsList.innerHTML = '';
        
        const filteredItems = items.filter(item => 
            settings.getDisplayText(item).toLowerCase().includes(filterText.toLowerCase())
        );
        
        if (filteredItems.length === 0) {
            const noResults = document.createElement('div');
            noResults.className = 'no-results';
            noResults.textContent = 'Нет результатов';
            optionsList.appendChild(noResults);
            return;
        }
        
        filteredItems.forEach(item => {
            const option = document.createElement('div');
            option.className = 'option-item';
            option.textContent = settings.getDisplayText(item);
            option.dataset.value = settings.getValue(item);
            
            // Выделяем выбранный элемент
            if (option.dataset.value === selectElement.value) {
                option.classList.add('selected');
            }
            
            option.addEventListener('click', () => {
                // Обновляем оригинальный select
                selectElement.value = option.dataset.value;
                
                // Создаем и отправляем событие изменения
                const event = new Event('change', { bubbles: true });
                selectElement.dispatchEvent(event);
                
                // Обновляем отображение
                selectedDisplay.textContent = option.textContent;
                
                // Закрываем выпадающий список
                closeDropdown();
            });
            
            optionsList.appendChild(option);
        });
    }
    
    // Функция открытия выпадающего списка
    function openDropdown() {
        dropdown.style.display = 'block';
        toggleButton.innerHTML = '<i class="fas fa-chevron-up"></i>';
        searchBox.focus();
        renderOptions();
    }
    
    // Функция закрытия выпадающего списка
    function closeDropdown() {
        dropdown.style.display = 'none';
        toggleButton.innerHTML = '<i class="fas fa-chevron-down"></i>';
        searchBox.value = '';
    }
    
    // Обработчики событий
    selectedContainer.addEventListener('click', () => {
        if (dropdown.style.display === 'block') {
            closeDropdown();
        } else {
            openDropdown();
        }
    });
    
    searchBox.addEventListener('input', (e) => {
        renderOptions(e.target.value);
    });
    
    // Закрываем выпадающий список при клике вне его
    document.addEventListener('click', (e) => {
        if (!wrapper.contains(e.target)) {
            closeDropdown();
        }
    });
    
    // Закрываем выпадающий список по умолчанию
    closeDropdown();
    
    // Устанавливаем начальное значение, если есть
    if (selectElement.value) {
        const selectedItem = items.find(item => settings.getValue(item) == selectElement.value);
        if (selectedItem) {
            selectedDisplay.textContent = settings.getDisplayText(selectedItem);
        }
    }
    
    // Возвращаем объект управления
    return {
        setValue: (value, displayText) => {
            selectElement.value = value;
            selectedDisplay.textContent = displayText || (value ? value : settings.placeholder);
            
            // Создаем и отправляем событие изменения
            const event = new Event('change', { bubbles: true });
            selectElement.dispatchEvent(event);
        },
        
        getValue: () => selectElement.value,
        
        update: (newItems) => {
            items = newItems;
            renderOptions();
        },
        
        reset: () => {
            selectElement.value = '';
            selectedDisplay.textContent = settings.placeholder;
        }
    };
}