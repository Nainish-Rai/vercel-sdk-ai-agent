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

// Display banner
console.log(
  chalk.blue.bold(`
╔══════════════════════════════════════════════════════════╗
║                🤖 Orchids Database Agent                ║
║              AI-Powered Database Assistant               ║
╚══════════════════════════════════════════════════════════╝
`)
);

program
  .name("orchids-db-agent")
  .description("AI-powered database agent for Next.js projects")
  .version("1.0.0")
  .on("command:*", () => {
    logger.error(`Unknown command: ${program.args.join(" ")}`);
    logger.info("Use --help to see available commands");
    process.exit(1);
  });

program
  .command("init")
  .description("Initialize database setup for the project")
  .option("-f, --force", "Force initialization even if files exist")
  .action(async (options) => {
    try {
      await initCommand(options);
    } catch (error) {
      logger.error(
        "Init command failed:",
        error instanceof Error ? error.message : String(error)
      );
      process.exit(1);
    }
  });

program
  .command("query <text>")
  .description("Execute a natural language database query")
  .option("-v, --verbose", "Show detailed execution steps")
  .option("-d, --dry-run", "Show what would be done without executing")
  .action(async (text, options) => {
    try {
      await queryCommand(text, options);
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
  .description("Show current database and project status")
  .option("-a, --all", "Show detailed status including file analysis")
  .action(async (options) => {
    try {
      await statusCommand(options);
    } catch (error) {
      logger.error(
        "Status command failed:",
        error instanceof Error ? error.message : String(error)
      );
      process.exit(1);
    }
  });

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n");
  logger.info("Database agent interrupted. Goodbye! 👋");
  process.exit(0);
});

// Parse command line arguments
program.parse();
