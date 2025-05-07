export function debounce(func, delay) {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

export function getCurrentMonth() {
    const slider = document.getElementById('monthSlider');
    if (!slider) {
        console.warn('monthSlider not found');
        return null;
    }

    const month = slider.value;

    // Ensure two-digit month
    const paddedMonth = month.padStart(2, '0');

    console.log("getCurrentMonth() Returning: ", paddedMonth);

    return paddedMonth;
}