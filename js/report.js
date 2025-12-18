/**
 * Visor de informe PDF - tema y controles básicos
 */

let currentTheme = localStorage.getItem('theme') || 'light';

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    currentTheme = theme;
    localStorage.setItem('theme', theme);

    const iconSun = document.getElementById('icon-sun');
    const iconMoon = document.getElementById('icon-moon');
    if (iconSun && iconMoon) {
        iconSun.style.display = theme === 'dark' ? 'none' : 'block';
        iconMoon.style.display = theme === 'dark' ? 'block' : 'none';
    }
}

function toggleTheme() {
    applyTheme(currentTheme === 'light' ? 'dark' : 'light');
}

document.addEventListener('DOMContentLoaded', () => {
    applyTheme(currentTheme);
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) themeToggle.addEventListener('click', toggleTheme);
});

