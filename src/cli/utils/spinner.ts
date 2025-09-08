import chalk from "chalk";

export interface Spinner {
  start(): void;
  stop(): void;
  succeed(text?: string): void;
  fail(text?: string): void;
  warn(text?: string): void;
  info(text?: string): void;
}

export function createSpinner(text: string): Spinner {
  let interval: NodeJS.Timeout | null = null;
  let isSpinning = false;
  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  let frameIndex = 0;

  return {
    start() {
      if (isSpinning) return;

      isSpinning = true;
      process.stdout.write("\x1B[?25l"); // Hide cursor

      interval = setInterval(() => {
        process.stdout.write(
          "\r" + chalk.cyan(frames[frameIndex]) + " " + text
        );
        frameIndex = (frameIndex + 1) % frames.length;
      }, 80);
    },

    stop() {
      if (!isSpinning) return;

      isSpinning = false;
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
      process.stdout.write("\r" + " ".repeat(text.length + 2) + "\r");
      process.stdout.write("\x1B[?25h"); // Show cursor
    },

    succeed(successText?: string) {
      this.stop();
      console.log(chalk.green("✅") + " " + (successText || text));
    },

    fail(errorText?: string) {
      this.stop();
      console.log(chalk.red("❌") + " " + (errorText || text));
    },

    warn(warningText?: string) {
      this.stop();
      console.log(chalk.yellow("⚠️") + " " + (warningText || text));
    },

    info(infoText?: string) {
      this.stop();
      console.log(chalk.blue("ℹ️") + " " + (infoText || text));
    },
  };
}
