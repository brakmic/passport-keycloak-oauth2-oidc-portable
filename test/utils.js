// File: test/utils.js

const { exec } = require('child_process');
const axios = require('axios');

/**
 * Executes a shell command and returns a promise.
 * @param {string} cmd - The command to execute.
 * @returns {Promise<{stdout: string, stderr: string}>}
 */
function execCommand(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        return reject({ error, stdout, stderr });
      }
      resolve({ stdout, stderr });
    });
  });
}

/**
 * Waits for a service to become ready by polling a URL.
 * @param {string} url - The URL to poll.
 * @param {number} timeout - Maximum time to wait in milliseconds.
 * @param {number} interval - Polling interval in milliseconds.
 * @returns {Promise<void>}
 */
async function waitForServiceReady(url, timeout = 60000, interval = 2000) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    try {
      const res = await axios.get(url);
      if (res.status === 200) {
        return;
      }
    } catch {
      // Service not ready yet; wait & retry
    }
    await new Promise((r) => setTimeout(r, interval));
  }
  throw new Error('Service did not become ready in time.');
}

module.exports = {
  execCommand,
  waitForServiceReady,
};
