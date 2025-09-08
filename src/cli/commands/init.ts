import { logger } from "../utils/logger";
import { createSpinner } from "../utils/spinner";
import fs from "fs";
import inquirer from "inquirer";
import chalk from "chalk";

export async function initCommand() {
  logger.info("Initializing database setup for your Next.js project...");

  try {
    // Check if .env.local exists
    const envExists = fs.existsSync(".env.local");

    if (!envExists) {
      logger.warn("No .env.local file found. Creating one...");

      const answers = await inquirer.prompt([
        {
          type: "input",
          name: "databaseUrl",
          message: "Enter your PostgreSQL database URL:",
          validate: (input) => {
            if (!input.startsWith("postgresql://")) {
              return "Please enter a valid PostgreSQL URL (starting with postgresql://)";
            }
            return true;
          },
        },
        {
          type: "input",
          name: "geminiApiKey",
          message: "Enter your Google Gemini API key:",
          validate: (input) => {
            if (!input.trim()) {
              return "API key is required";
            }
            return true;
          },
        },
      ]);

      const envContent = `# Database
DATABASE_URL=${answers.databaseUrl}

# AI
GOOGLE_GENERATIVE_AI_API_KEY=${answers.geminiApiKey}

# Development
NODE_ENV=development
`;

      fs.writeFileSync(".env.local", envContent);
      logger.success("Created .env.local file with your configuration");
    } else {
      logger.info("Found existing .env.local file");
    }

    // Create Drizzle config if it doesn't exist
    if (!fs.existsSync("drizzle.config.ts")) {
      const drizzleConfig = `import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

config({ path: ".env.local" });

export default defineConfig({
  schema: "./src/database/schemas/*",
  out: "./src/database/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
`;

      fs.writeFileSync("drizzle.config.ts", drizzleConfig);
      logger.success("Created drizzle.config.ts");
    }

    // Create database connection if it doesn't exist
    if (!fs.existsSync("src/database/connection.ts")) {
      const spinner = createSpinner("Setting up database connection...");
      spinner.start();

      const connectionContent = `import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from 'dotenv';

config({ path: '.env.local' });

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

const client = postgres(process.env.DATABASE_URL);
export const db = drizzle(client);
`;

      if (!fs.existsSync("src/database")) {
        fs.mkdirSync("src/database", { recursive: true });
      }

      fs.writeFileSync("src/database/connection.ts", connectionContent);
      spinner.succeed("Database connection setup complete");
    }

    logger.success("🎉 Database agent initialization complete!");
    logger.info("\nNext steps:");
    console.log("1. Update your .env.local with correct database credentials");
    console.log('2. Run: npm run agent:query "your database request"');
    console.log(
      '3. Example: npm run agent:query "Can you store the recently played songs in a table"'
    );
  } catch (error) {
    if (error instanceof Error) {
      logger.error("Initialization failed:", error.message);
    } else {
      logger.error("Initialization failed:", String(error));
    }
    process.exit(1);
  }
}
