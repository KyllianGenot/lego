let spinnerInterval = null;
let dots = 0;
const maxDots = 3;
let currentText = '';
let isSpinning = false;

// Helper function to clear the current line in the terminal
function clearLine() {
  process.stdout.clearLine(0); // Clear the current line
  process.stdout.cursorTo(0); // Move cursor to the beginning of the line
}

async function startSpinner(text) {
  stopSpinner(); // Ensure any previous spinner is stopped
  currentText = text;
  dots = 0;
  isSpinning = true;

  // Print initial spinner state
  clearLine();
  process.stdout.write(`${text} `);

  // Ensure at least one animation frame is displayed
  spinnerInterval = setInterval(() => {
    if (!isSpinning) return;

    dots = (dots + 1) % (maxDots + 1);
    const dotString = '.'.repeat(dots);
    const paddingString = ' '.repeat(maxDots - dots);

    clearLine();
    process.stdout.write(`${currentText} ${dotString}${paddingString}`);
  }, 300); // Update dots every 300ms

  // Ensure the spinner is visible for at least a short time
  await new Promise(resolve => setTimeout(resolve, 300));
}

function updateSpinnerText(text) {
  if (spinnerInterval && isSpinning) {
    currentText = text;
    clearLine();
    process.stdout.write(`${text} ${''.padEnd(maxDots)}`);
    dots = 0;
  }
}

function stopSpinner() {
  if (spinnerInterval) {
    clearInterval(spinnerInterval);
    spinnerInterval = null;
    isSpinning = false;
    clearLine();
  }
}

/**
 * Helper function to create a delay using Promise and setTimeout
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise} Resolves after the specified delay
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = { startSpinner, updateSpinnerText, stopSpinner, delay };