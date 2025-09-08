import chalk from "chalk";

export function createSpinner(message: string) {
  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  let currentFrame = 0;
  let interval: NodeJS.Timeout | null = null;

  return {
    start() {
      process.stdout.write("\x1B[?25l"); // Hide cursor
      interval = setInterval(() => {
        process.stdout.write(
          `\r${chalk.cyan(frames[currentFrame])} ${message}`
        );
        currentFrame = (currentFrame + 1) % frames.length;
      }, 100);
    },

    stop() {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
      process.stdout.write("\r\x1B[K"); // Clear line
      process.stdout.write("\x1B[?25h"); // Show cursor
    },

    succeed(successMessage?: string) {
      this.stop();
      console.log(chalk.green("✅"), successMessage || message);
    },

    fail(errorMessage?: string) {
      this.stop();
      console.log(chalk.red("❌"), errorMessage || `Failed: ${message}`);
    },
  };
}
