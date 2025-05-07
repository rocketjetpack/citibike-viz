//import { switchMapTheme } from "./map.js";
import { toggleDarkTheme } from './map.js'; // Import the function to toggle the map theme
import { debounce } from './utils.js';
import { handleMonthChange } from './stationManager.js';
import { drawRideLines } from './rideLines.js';

export function initializeEvents() {
  console.log("Initializing events.");

  const chkDarkTheme = document.getElementById('chkDarkTheme');
  const body = document.body;
  const header = document.querySelector('header');

  chkDarkTheme.addEventListener('change', () => {
    toggleDarkTheme(chkDarkTheme.checked);
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

  document.getElementById('monthSlider').addEventListener('input', debounce(() => {
    handleMonthChange();
  }, 200));
  
  document.getElementById('chkShowInbound').addEventListener('change', debounce(() => {
    console.log("Redraw ride lines.");
  }, 200));

  document.getElementById('chkShowOutbound').addEventListener('change', debounce(() => {
    console.log("Redraw ride lines.");
  }, 200));

}


