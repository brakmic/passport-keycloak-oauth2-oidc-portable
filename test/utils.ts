import { exec } from "child_process";
import axios from "axios";

/**
 * Executes a shell command and returns a promise.
 * @param cmd - The command to execute.
 * @returns A promise resolving with stdout and stderr.
 */
export function execCommand(
  cmd: string
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        reject({ error, stdout, stderr });
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

/**
 * Waits for a service to become ready by polling a URL.
 * @param url - The URL to poll.
 * @param timeout - Maximum time to wait in milliseconds.
 * @param interval - Polling interval in milliseconds.
 * @returns A promise that resolves when the service is ready.
 */
export async function waitForServiceReady(
  url: string,
  timeout: number = 60000,
  interval: number = 2000
): Promise<void> {
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
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  throw new Error(`Service did not become ready in time: ${url}`);
}
