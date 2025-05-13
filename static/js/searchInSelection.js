/**
 * Создает расширенный выпадающий список с возможностью поиска
 * @param {HTMLSelectElement} selectElement
 * @param {Array} items
 * @param {Object} options
 * @param {Function} options.getDisplayText
 * @param {Function} options.getValue
 * @param {string} options.placeholder
 * @param {string} options.searchPlaceholder
 * @returns {Object}
 */
export function createSearchableSelect(selectElement, items, options = {}) {

    const defaults = {
        getDisplayText: item => item.toString(),
        getValue: item => item,
        placeholder: 'Выберите...',
        searchPlaceholder: 'Поиск...'
    };

    const settings = { ...defaults, ...options };


    selectElement.style.display = 'none';


    const wrapper = document.createElement('div');
    wrapper.className = 'custom-select-wrapper';


    const selectedDisplay = document.createElement('div');
    selectedDisplay.className = 'selected-value';
    selectedDisplay.textContent = settings.placeholder;


    const toggleButton = document.createElement('span');
    toggleButton.className = 'toggle-dropdown';
    toggleButton.innerHTML = '<i class="fas fa-chevron-down"></i>';


    const selectedContainer = document.createElement('div');
    selectedContainer.className = 'selected-container';
    selectedContainer.appendChild(selectedDisplay);
    selectedContainer.appendChild(toggleButton);


    wrapper.appendChild(selectedContainer);


    const dropdown = document.createElement('div');
    dropdown.className = 'dropdown-container';


    const searchBox = document.createElement('input');
    searchBox.type = 'text';
    searchBox.className = 'search-box';
    searchBox.placeholder = settings.searchPlaceholder;


    dropdown.appendChild(searchBox);


    const optionsList = document.createElement('div');
    optionsList.className = 'options-list';


    dropdown.appendChild(optionsList);


    wrapper.appendChild(dropdown);


    selectElement.parentNode.insertBefore(wrapper, selectElement.nextSibling);


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


            if (option.dataset.value === selectElement.value) {
                option.classList.add('selected');
            }

            option.addEventListener('click', () => {

                selectElement.value = option.dataset.value;


                const event = new Event('change', { bubbles: true });
                selectElement.dispatchEvent(event);


                selectedDisplay.textContent = option.textContent;


                closeDropdown();
            });

            optionsList.appendChild(option);
        });
    }


    function openDropdown() {
        dropdown.style.display = 'block';
        toggleButton.innerHTML = '<i class="fas fa-chevron-up"></i>';
        searchBox.focus();
        renderOptions();
    }


    function closeDropdown() {
        dropdown.style.display = 'none';
        toggleButton.innerHTML = '<i class="fas fa-chevron-down"></i>';
        searchBox.value = '';
    }


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


    document.addEventListener('click', (e) => {
        if (!wrapper.contains(e.target)) {
            closeDropdown();
        }
    });


    closeDropdown();


    if (selectElement.value) {
        const selectedItem = items.find(item => settings.getValue(item) == selectElement.value);
        if (selectedItem) {
            selectedDisplay.textContent = settings.getDisplayText(selectedItem);
        }
    }


    return {
        setValue: (value, displayText) => {
            selectElement.value = value;
            selectedDisplay.textContent = displayText || (value ? value : settings.placeholder);


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