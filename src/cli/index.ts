#!/usr/bin/env node

import { Command } from "commander";
import { initCommand } from "./commands/init";
import { queryCommand } from "./commands/query";
import { statusCommand } from "./commands/status";
import { logger } from "./utils/logger";
import chalk from "chalk";
import { config } from "dotenv";

// Load environment variables
config({ path: ".env.local" });

const program = new Command();

program
  .name("orchids-agent")
  .description("AI-powered database agent for Next.js projects")
  .version("1.0.0");

program
  .command("init")
  .description("Initialize database setup for your project")
  .action(async () => {
    try {
      await initCommand();
    } catch (error) {
      logger.error(
        "Init command failed:",
        error instanceof Error ? error.message : String(error)
      );
      process.exit(1);
    }
  });

program
  .command("query")
  .description("Execute natural language database queries")
  .argument("<text>", "Natural language description of what you want to do")
  .action(async (text) => {
    try {
      await queryCommand(text);
    } catch (error) {
      logger.error(
        "Query command failed:",
        error instanceof Error ? error.message : String(error)
      );
      process.exit(1);
    }
  });

program
  .command("status")
  .description("Show current project status and setup progress")
  .action(async () => {
    try {
      await statusCommand();
    } catch (error) {
      logger.error(
        "Status command failed:",
        error instanceof Error ? error.message : String(error)
      );
      process.exit(1);
    }
  });

// Show help by default if no command is provided
program.action(() => {
  console.log(chalk.cyan("🤖 Orchids Database Agent"));
  console.log(
    chalk.gray("AI-powered database management for Next.js projects\n")
  );
  program.help();
});

// Parse command line arguments
program.parse();
