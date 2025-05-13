const calendar = document.getElementById("calendar");
const monthYear = document.getElementById("month-year");
const daysContainer = document.getElementById("days");
const prevButton = document.getElementById("prev");
const nextButton = document.getElementById("next");
let currentDate = new Date();


let tasks = {};

window.refreshCalendar = function () {
    tasks = {};
    tasks = window.calendarTasks || {};
    renderCalendar(currentDate);
    console.log(tasks);
};

function renderCalendar(date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay() || 7;
    const lastDay = new Date(year, month + 1, 0).getDate();
    monthYear.textContent = `${date.toLocaleString("ru", { month: "long" })} ${year}`;
    daysContainer.innerHTML = "";
    for (let i = 1; i < firstDayIndex; i++) {
        const emptyDay = document.createElement("div");
        daysContainer.appendChild(emptyDay);
    }
    for (let day = 1; day <= lastDay; day++) {
        const dayElement = document.createElement("div");
        dayElement.classList.add("day");
        const dayNumber = document.createElement("div");
        dayNumber.classList.add("day-number");
        dayNumber.textContent = day;
        dayElement.appendChild(dayNumber);
        const tasksContainer = document.createElement("div");
        tasksContainer.classList.add("tasks");
        const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

        if (tasks[dateKey]) {
            tasks[dateKey].forEach(task => {
                const taskElement = document.createElement("div");
                taskElement.classList.add('task');
                if (task.type === 'event') {
                    taskElement.classList.add('event-task');
                } else if (task.type === 'meeting') {
                    taskElement.classList.add('meeting-task');
                }
                taskElement.textContent = `${task.title}`;
                tasksContainer.appendChild(taskElement);
            });
        }
        dayElement.appendChild(tasksContainer);
        const today = new Date();
        if (day === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
            dayElement.classList.add("today");

        }
        daysContainer.appendChild(dayElement);

    }

}

prevButton.addEventListener("click", () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar(currentDate);
});

nextButton.addEventListener("click", () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar(currentDate);

});

renderCalendar(currentDate);