import chalk from "chalk";

export const logger = {
  info: (message: string, ...args: any[]) => {
    console.log(chalk.blue("ℹ"), message, ...args);
  },

  success: (message: string, ...args: any[]) => {
    console.log(chalk.green("✅"), message, ...args);
  },

  error: (message: string, ...args: any[]) => {
    console.log(chalk.red("❌"), message, ...args);
  },

  warn: (message: string, ...args: any[]) => {
    console.log(chalk.yellow("⚠️"), message, ...args);
  },

  debug: (message: string, ...args: any[]) => {
    if (process.env.NODE_ENV === "development") {
      console.log(chalk.gray("🐛"), message, ...args);
    }
  },

  agent: (message: string, ...args: any[]) => {
    console.log(chalk.magenta("🤖"), message, ...args);
  },

  step: (step: number, total: number, message: string) => {
    console.log(chalk.cyan(`[${step}/${total}]`), message);
  },
};
