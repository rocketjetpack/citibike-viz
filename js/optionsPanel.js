import { months } from './init.js';
import { toggleDarkTheme } from './map.js'; // Import the function to toggle the map theme

export function getCheckedRideDirections() {
    return [ document.getElementById('chkShowOutbound').checked, document.getElementById('chkShowInbound').checked ];
}

export function initializeOptionsPanel() {
  const optionsPanel = document.getElementById('optionsPanel');
  const optionsHeader = document.getElementById('optionsHeader');
  
  // Variables for dragging functionality
  let isDragging = false, offsetX, offsetY;

  // Dragging functionality for the options panel
  optionsHeader.addEventListener('mousedown', (e) => {
      isDragging = true;
      offsetX = e.clientX - optionsPanel.offsetLeft;
      offsetY = e.clientY - optionsPanel.offsetTop;
      optionsPanel.style.cursor = 'move';
  });

  document.addEventListener('mousemove', (e) => {
      if (isDragging) {
        const newLeft = e.clientX - offsetX;
        const newTop = Math.max(0, e.clientY - offsetY);  // Clamp top so it never goes above 0
        optionsPanel.style.left = `${newLeft}px`;
        optionsPanel.style.top = `${newTop}px`;
      }
  });

  document.addEventListener('mouseup', () => {
      isDragging = false;
      optionsPanel.style.cursor = 'default';
      saveOptionsState();  // Save state when dragging ends
  });

  // Restore panel position from localStorage
  const savedPosition = JSON.parse(localStorage.getItem('optionsPanelPosition'));
  if (savedPosition) {
      optionsPanel.style.left = savedPosition.left;
      optionsPanel.style.top = savedPosition.top;
  }

  initializeEventListeners();
}

export function getSelectedMonth() {
    return document.getElementById("monthSlider").value;
}

// Save options state in localStorage
function saveOptionsState() {
  const state = {
      top: document.getElementById('optionsPanel').style.top,
      left: document.getElementById('optionsPanel').style.left,
      month: document.getElementById('monthSlider').value,
      darkTheme: document.getElementById('chkDarkTheme').checked,
      showTopRoutes: document.getElementById('chkShowTop50').checked,
      showInboundRides: document.getElementById('chkShowInbound').checked,
      showOutboundRides: document.getElementById('chkShowOutbound').checked,
  };
  localStorage.setItem('optionsState', JSON.stringify(state));
}

// Initialize event listeners
function initializeEventListeners() {
  const monthSlider = document.getElementById('monthSlider');
  const darkThemeToggle = document.getElementById('chkDarkTheme');
  const topRoutesToggle = document.getElementById('chkShowTop50');
  const showInboundRides = document.getElementById('chkShowInbound');
  const showOutboundRides = document.getElementById('chkShowOutbound');

  // Month slider event
  monthSlider.addEventListener('input', (e) => {
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      document.getElementById('monthLabel').textContent = months[e.target.value - 1];
      saveOptionsState();  // Save state on input change
  });

  // Dark theme toggle
  darkThemeToggle.addEventListener('change', () => {
      document.body.classList.toggle('dark-theme', darkThemeToggle.checked);
      saveOptionsState();  // Save state when toggled
  });

  // Top Routes toggle
  topRoutesToggle.addEventListener('change', saveOptionsState);

  // Inbound rides toggle
  showInboundRides.addEventListener('change', saveOptionsState);

  // Outbound rides toggle
  showOutboundRides.addEventListener('change', saveOptionsState);

  // Load options from saved state
  const savedState = JSON.parse(localStorage.getItem('optionsState'));
  if (savedState) {
      document.getElementById('optionsPanel').style.top = savedState.top;
      document.getElementById('optionsPanel').style.left = savedState.left;
      monthSlider.value = savedState.month;
      document.getElementById('monthLabel').textContent = months[savedState.month - 1];
      darkThemeToggle.checked = savedState.darkTheme;
      topRoutesToggle.checked = savedState.showTopRoutes;
      showInboundRides.checked = savedState.showInboundRides;
      showOutboundRides.checked = savedState.showOutboundRides;

      // Apply the dark theme if saved in localStorage
      if (savedState.darkTheme) {
          document.body.classList.add('dark-theme');
          toggleDarkTheme(true);
      } else {
          document.body.classList.remove('dark-theme');
          toggleDarkTheme(false);
      }
      
  }
}

export function getTheme() {
    return document.getElementById('chkDarkTheme').checked;
}