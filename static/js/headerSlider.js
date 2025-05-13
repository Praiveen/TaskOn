document.addEventListener('DOMContentLoaded', function() {
    const dropBtn = document.querySelector('.dropbtn');
    const dropdownContent = document.querySelector('.dropdown-content');
    let isOpen = false;

    dropBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        isOpen = !isOpen;
        if (isOpen) {
            dropdownContent.classList.add('show');
        } else {
            dropdownContent.classList.remove('show');
        }
    });

    // Закрываем меню при клике вне его
    document.addEventListener('click', function(e) {
        if (!dropBtn.contains(e.target) && !dropdownContent.contains(e.target)) {
            dropdownContent.classList.remove('show');
            isOpen = false;
        }
    });
});