document.getElementById("monthSlider").addEventListener("input", (e) => {
    const month = parseInt(e.target.value);
    console.log("Month selected:", month);
    // TODO: Reload map data and histogram for selected month
  });
  

const monthSlider = document.getElementById("monthSlider");
const monthLabel = document.getElementById("monthLabel");
const darkThemeToggle = document.getElementById("darkThemeToggle");

const monthNames = [
"January", "February", "March", "April", "May", "June",
"July", "August", "September", "October", "November", "December"
];

monthSlider.addEventListener("input", () => {
const month = parseInt(monthSlider.value);
monthLabel.textContent = monthNames[month - 1];
// TODO: Update ride data for this month
if (topRoutesToggle.checked) {
    toggleTopRoutes(true);
  }
});

darkThemeToggle.addEventListener("change", () => {
const dark = darkThemeToggle.checked;
switchBasemap(dark ? "dark" : "light");
});

const optionsPanel = document.getElementById("optionsPanel");
const optionsHeader = document.getElementById("optionsHeader");

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

monthSlider.addEventListener("input", () => {
    const month = parseInt(monthSlider.value);
    monthLabel.textContent = monthNames[month - 1];
    saveOptions();
    // TODO: Update ride data for this month
  });
  
darkThemeToggle.addEventListener("change", () => {
    const dark = darkThemeToggle.checked;
    switchBasemap(dark ? "dark" : "light");
    saveOptions();
  });

document.addEventListener('mouseup', () => {
    isDragging = false;
    saveOptions();
  });

const topRoutesToggle = document.getElementById("topRoutesToggle");

topRoutesToggle.addEventListener("change", () => {
    const show = topRoutesToggle.checked;
    saveOptions();
    toggleTopRoutes(show); // You’ll implement this in map.js
  });


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
        toggleTopRoutes(options.showTopRoutes); // Trigger on load
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
  
  loadOptions(); // call on page load