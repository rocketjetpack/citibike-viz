import { initializeMap } from './map.js';
import { initializeStationManager } from './stationManager.js';
import { initializeOptionsPanel } from './optionsPanel.js';
import { initializeEvents } from './events.js';

export const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

// Initialize the map
const map = initializeMap();

// Initialize the station manager to handle station selection
initializeStationManager(map);

// Initialize the options panel and its functionality (theme toggle, sliders, etc.)
initializeOptionsPanel();

// Load saved state for options panel
loadSavedState();

initializeEvents();

// Function to load saved state for the options panel from localStorage
function loadSavedState() {
  const savedState = JSON.parse(localStorage.getItem('optionsState'));
  if (savedState) {
    // Apply saved month, dark theme, and other options if available
    document.getElementById('monthSlider').value = savedState.month;
    document.getElementById('monthLabel').textContent = getMonthName(savedState.month);
    document.getElementById('chkDarkTheme').checked = savedState.darkTheme;
    document.getElementById('chkShowTop50').checked = savedState.showTopRoutes;
    document.getElementById('chkShowInbound').checked = savedState.showInboundRides;
    document.getElementById('chkShowOutbound').checked = savedState.showOutboundRides;

    // Apply dark theme if saved in localStorage
    if (savedState.darkTheme) {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  }
}

// Function to get month name from month number (1 to 12)
function getMonthName(month) {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return months[month - 1];
}


/*
import { setupEventListeners } from './events.js';
import { initializeOptionsPanel } from './optionsPanel.js';
import { initializeStationPanel } from './stationPanel.js';
import { initializeStationManager } from './stationManager.js';

// Create and export map + tile layers so events.js can access them


// Setup UI and theme toggle event listeners]
const markersById = {}; 
let map = null;
let lightLayer = null;
let darkLayer = null;

export const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

export function initialize() {
  // Initialize options panel and station panel
  initializeOptionsPanel();
  initializeStationPanel();
  
  const chkDarkTheme = document.getElementById('chkDarkTheme');
  if (chkDarkTheme.checked) {
    document.body.classList.add('dark-theme');
  } else {
    document.body.classList.remove('dark-theme');
  }

  // Additional initialization logic can go here
  map = createMap();
  console.log(map);

  initializeStationManager(map);
}

// Call the initialize function when the page is ready
document.addEventListener('DOMContentLoaded', () => {
  initialize();
  const stationInfoPanel = document.getElementById('stationPanel');
  console.log(stationInfoPanel.getBoundingClientRect());  
});
*/
