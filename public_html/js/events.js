import { switchMapTheme } from "./map.js";

export function setupEventListeners() {
  const chkDarkTheme = document.getElementById('chkDarkTheme');
  const body = document.body;
  const header = document.querySelector('header');

  chkDarkTheme.addEventListener('change', () => {
    const dark = chkDarkTheme.checked;
    if (dark) {
      body.classList.add('dark');
      header.classList.add('dark');
    } else {
      body.classList.remove('dark');
      header.classList.remove('dark');
    }
    switchMapTheme();
  });

  const monthSlider = document.getElementById('monthSlider');
  const monthLabel = document.getElementById('monthLabel');
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  monthSlider.addEventListener('input', () => {
    const value = parseInt(monthSlider.value, 10);
    monthLabel.textContent = months[value - 1];
  });
}
