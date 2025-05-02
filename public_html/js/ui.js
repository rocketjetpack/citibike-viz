const monthSlider = document.getElementById("monthSlider");
const monthLabel = document.getElementById("monthLabel");
const darkThemeToggle = document.getElementById("darkThemeToggle");
const topRoutesToggle = document.getElementById("topRoutesToggle");
const selectedStationIdInput = document.getElementById("selectedStationId");

const optionsPanel = document.getElementById("optionsPanel");
const optionsHeader = document.getElementById("optionsHeader");

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

let offsetX = 0, offsetY = 0, isDragging = false;

optionsHeader.addEventListener('mousedown', (e) => {
  isDragging = true;
  offsetX = e.clientX - optionsPanel.offsetLeft;
  offsetY = e.clientY - optionsPanel.offsetTop;
});

document.addEventListener('mousemove', (e) => {
  if (isDragging) {
    optionsPanel.style.left = (e.clientX - offsetX) + 'px';
    optionsPanel.style.top = (e.clientY - offsetY) + 'px';
  }
});

document.addEventListener('mouseup', () => {
  isDragging = false;
  saveOptions();
});

darkThemeToggle.addEventListener("change", () => {
  const dark = darkThemeToggle.checked;
  switchBasemap(dark ? "dark" : "light");
  saveOptions();
});

topRoutesToggle.addEventListener("change", () => {
  const show = topRoutesToggle.checked;
  toggleTopRoutes(show);
  saveOptions();
});

monthSlider.addEventListener("input", () => {
  const month = parseInt(monthSlider.value);
  monthLabel.textContent = monthNames[month - 1];
});

let monthUpdateTimeout = null;
monthSlider.addEventListener("change", () => {
  const month = parseInt(monthSlider.value);
  monthLabel.textContent = monthNames[month - 1];
  saveOptions();

  // Only update when slider stops moving (on 'change' instead of 'input')
  if (topRoutesToggle.checked) {
    toggleTopRoutes(true);
  }

  // Update data if a station is selected
  const selectedStationId = selectedStationIdInput.value;
  if (selectedStationId) {
    updateStationData(); // Function from map.js
  }
});

function saveOptions() {
  const options = {
    month: parseInt(monthSlider.value),
    darkTheme: darkThemeToggle.checked,
    showTopRoutes: topRoutesToggle.checked,
    panelTop: optionsPanel.style.top,
    panelLeft: optionsPanel.style.left
  };
  localStorage.setItem("citibikeOptions", JSON.stringify(options));
}

function loadOptions() {
  const saved = localStorage.getItem("citibikeOptions");
  if (!saved) return;

  try {
    const options = JSON.parse(saved);
    if (options.month) {
      monthSlider.value = options.month;
      monthLabel.textContent = monthNames[options.month - 1];
    }
    if (typeof options.darkTheme === 'boolean') {
      darkThemeToggle.checked = options.darkTheme;
      switchBasemap(options.darkTheme ? "dark" : "light");
    }
    if (typeof options.showTopRoutes === 'boolean') {
      topRoutesToggle.checked = options.showTopRoutes;
      toggleTopRoutes(options.showTopRoutes);
    }
    if (options.panelTop && options.panelLeft) {
      optionsPanel.style.top = options.panelTop;
      optionsPanel.style.left = options.panelLeft;
      optionsPanel.style.right = "";
    }
  } catch (e) {
    console.warn("Failed to load saved options:", e);
  }
}

loadOptions();
