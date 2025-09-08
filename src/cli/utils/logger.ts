import chalk from "chalk";

export const logger = {
  info: (message: string, ...args: any[]) => {
    console.log(chalk.blue("ℹ"), message, ...args);
  },

  success: (message: string, ...args: any[]) => {
    console.log(chalk.green("✅"), message, ...args);
  },

  warning: (message: string, ...args: any[]) => {
    console.log(chalk.yellow("⚠️"), message, ...args);
  },

  warn: (message: string, ...args: any[]) => {
    console.log(chalk.yellow("⚠️"), message, ...args);
  },

  error: (message: string, ...args: any[]) => {
    console.log(chalk.red("❌"), message, ...args);
  },

  step: (step: number, message: string) => {
    console.log(chalk.cyan(`[${step}]`), message);
  },

  progress: (message: string) => {
    console.log(chalk.magenta("🔄"), message);
  },

  agent: (message: string) => {
    console.log(chalk.blue("🤖"), chalk.bold("Agent:"), message);
  },

  database: (message: string) => {
    console.log(chalk.green("🗄️"), chalk.bold("Database:"), message);
  },

  api: (message: string) => {
    console.log(chalk.magenta("🔗"), chalk.bold("API:"), message);
  },

  component: (message: string) => {
    console.log(chalk.cyan("⚛️"), chalk.bold("Component:"), message);
  },
};
