import { createSpinner } from "../utils/spinner";
import { logger } from "../utils/logger";
import chalk from "chalk";
import fs from "fs";
import path from "path";

interface InitOptions {
  force?: boolean;
}

export async function initCommand(options: InitOptions = {}) {
  const { force } = options;

  console.log(chalk.blue.bold("\n🚀 Initializing Database Agent Setup...\n"));

  const spinner = createSpinner("Setting up database infrastructure...");

  try {
    spinner.start();

    // Check if this is a Next.js project
    if (!fs.existsSync("package.json")) {
      spinner.fail("Not a valid Node.js project");
      logger.error(
        "package.json not found. Make sure you're in a Next.js project directory."
      );
      process.exit(1);
    }

    const packageJson = JSON.parse(fs.readFileSync("package.json", "utf-8"));
    if (!packageJson.dependencies?.next) {
      spinner.fail("Not a Next.js project");
      logger.error(
        "This doesn't appear to be a Next.js project. The agent is designed for Next.js projects."
      );
      process.exit(1);
    }

    spinner.stop();
    logger.success("✅ Valid Next.js project detected");

    // Create directory structure
    const directories = [
      "src/database",
      "src/database/schemas",
      "src/database/migrations",
      "src/database/seeds",
      "src/hooks",
      "src/types",
      "src/app/api",
    ];

    logger.info("\n📁 Creating directory structure...");
    directories.forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        logger.success(`Created: ${dir}`);
      } else {
        logger.info(`Exists: ${dir}`);
      }
    });

    // Create database connection file
    const connectionPath = "src/database/connection.ts";
    if (!fs.existsSync(connectionPath) || force) {
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

      fs.writeFileSync(connectionPath, connectionContent);
      logger.success("✅ Created database connection file");
    } else {
      logger.info("Database connection file already exists");
    }

    // Create Drizzle config
    const drizzleConfigPath = "drizzle.config.ts";
    if (!fs.existsSync(drizzleConfigPath) || force) {
      const drizzleConfig = `import type { Config } from 'drizzle-kit';
import { config } from 'dotenv';

config({ path: '.env.local' });

export default {
  schema: './src/database/schemas/*',
  out: './src/database/migrations',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
} satisfies Config;
`;

      fs.writeFileSync(drizzleConfigPath, drizzleConfig);
      logger.success("✅ Created Drizzle configuration");
    } else {
      logger.info("Drizzle config already exists");
    }

    // Create .env.local template if it doesn't exist
    const envPath = ".env.local";
    if (!fs.existsSync(envPath)) {
      const envTemplate = `# Database Configuration
DATABASE_URL=postgresql://username:password@host:port/database

# AI Configuration
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key_here

# Development
NODE_ENV=development
`;

      fs.writeFileSync(envPath, envTemplate);
      logger.success("✅ Created .env.local template");
      logger.warning(
        "⚠️  Please update .env.local with your actual database and API credentials"
      );
    } else {
      logger.info(".env.local already exists");
    }

    // Add scripts to package.json if they don't exist
    const requiredScripts = {
      "db:generate": "drizzle-kit generate",
      "db:migrate": "drizzle-kit migrate",
      "db:studio": "drizzle-kit studio",
      "agent:query": "tsx src/cli/index.ts query",
      "agent:status": "tsx src/cli/index.ts status",
    };

    let scriptsAdded = false;
    Object.entries(requiredScripts).forEach(([script, command]) => {
      if (!packageJson.scripts[script] || force) {
        packageJson.scripts[script] = command;
        scriptsAdded = true;
      }
    });

    if (scriptsAdded || force) {
      fs.writeFileSync("package.json", JSON.stringify(packageJson, null, 2));
      logger.success("✅ Added database scripts to package.json");
    } else {
      logger.info("Database scripts already exist in package.json");
    }

    // Display setup summary
    console.log(
      chalk.green.bold("\n🎉 Database Agent Initialization Complete!\n")
    );

    console.log(chalk.cyan.bold("📋 What was created:"));
    console.log(chalk.white("• Database directory structure"));
    console.log(chalk.white("• Drizzle ORM configuration"));
    console.log(chalk.white("• Database connection setup"));
    console.log(chalk.white("• Environment configuration template"));
    console.log(chalk.white("• NPM scripts for database operations"));

    console.log(chalk.yellow.bold("\n⚡ Next Steps:"));
    console.log(
      chalk.white("1. Update .env.local with your database credentials")
    );
    console.log(
      chalk.white("2. Add your GOOGLE_GENERATIVE_AI_API_KEY to .env.local")
    );
    console.log(
      chalk.white(
        '3. Run your first query: npm run agent:query "Create a users table"'
      )
    );

    console.log(chalk.blue.bold("\n💡 Example Queries:"));
    console.log(
      chalk.gray('• "Can you store the recently played songs in a table"')
    );
    console.log(chalk.gray('• "Create a table for user playlists with songs"'));
    console.log(chalk.gray('• "Add an API endpoint for managing favorites"'));
  } catch (error) {
    spinner.fail("Initialization failed");
    logger.error(
      "Setup failed:",
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
}
