/**
 * A simple console spinner with controlled output
 */

const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
let spinnerInterval = null;
let frameIndex = 0;
let message = '';
let isActive = false;

/**
 * Start the spinner
 * @param {string} text - Initial message to display with the spinner
 */
async function startSpinner(text) {
  if (isActive) {
    await stopSpinner();
  }

  message = text;
  isActive = true;

  // Clear the current line and move cursor to start
  process.stdout.clearLine(0);
  process.stdout.cursorTo(0);
  process.stdout.write(`${spinnerFrames[frameIndex]} ${message}`);

  // Start the spinning animation
  spinnerInterval = setInterval(() => {
    if (!isActive) return;

    frameIndex = (frameIndex + 1) % spinnerFrames.length;

    // Overwrite the current line
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
    process.stdout.write(`${spinnerFrames[frameIndex]} ${message}`);
  }, 80);

  return new Promise(resolve => setTimeout(resolve, 100));
}

/**
 * Update the spinner text
 * @param {string} text - New message to display with the spinner
 */
function updateSpinnerText(text) {
  if (isActive) {
    message = text;
    // Immediately update the current line
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
    process.stdout.write(`${spinnerFrames[frameIndex]} ${message}`);
  } else {
    // If no spinner is active, log normally
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
    process.stdout.write(text + '\n');
  }
}

/**
 * Stop the spinner
 */
async function stopSpinner() {
  return new Promise(resolve => {
    if (!isActive) {
      resolve();
      return;
    }

    isActive = false;
    clearInterval(spinnerInterval);
    spinnerInterval = null;

    // Clear the spinner line and show the final message
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
    process.stdout.write(message + '\n');

    resolve();
  });
}

/**
 * Log a message without interfering with the spinner
 * @param {string} text - Message to log
 */
function log(text) {
  if (isActive) {
    // Temporarily stop spinner, log, and restart
    clearInterval(spinnerInterval);
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
    process.stdout.write(text + '\n');
    spinnerInterval = setInterval(() => {
      if (!isActive) return;
      frameIndex = (frameIndex + 1) % spinnerFrames.length;
      process.stdout.clearLine(0);
      process.stdout.cursorTo(0);
      process.stdout.write(`${spinnerFrames[frameIndex]} ${message}`);
    }, 80);
  } else {
    process.stdout.write(text + '\n');
  }
}

/**
 * Create a delay
 * @param {number} ms - Milliseconds to delay
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = { startSpinner, updateSpinnerText, stopSpinner, log, delay };