import { logger } from "../utils/logger";
import chalk from "chalk";
import fs from "fs";
import path from "path";

interface StatusOptions {
  all?: boolean;
}

export async function statusCommand(options: StatusOptions = {}) {
  const { all } = options;

  console.log(chalk.blue.bold("\n📊 Database Agent Status Report\n"));

  try {
    // Check project structure
    console.log(chalk.cyan.bold("🏗️  Project Structure:"));

    const projectChecks = {
      "package.json": fs.existsSync("package.json"),
      "Next.js project":
        fs.existsSync("package.json") &&
        JSON.parse(fs.readFileSync("package.json", "utf-8")).dependencies?.next,
      "TypeScript config": fs.existsSync("tsconfig.json"),
      "Drizzle config": fs.existsSync("drizzle.config.ts"),
      "Environment file": fs.existsSync(".env.local"),
    };

    Object.entries(projectChecks).forEach(([name, exists]) => {
      if (exists) {
        logger.success(`${name}`);
      } else {
        logger.error(`${name} - Missing`);
      }
    });

    // Check database infrastructure
    console.log(chalk.cyan.bold("\n🗄️  Database Infrastructure:"));

    const dbChecks = {
      "Database directory": fs.existsSync("src/database"),
      "Connection file": fs.existsSync("src/database/connection.ts"),
      "Schemas directory": fs.existsSync("src/database/schemas"),
      "Migrations directory": fs.existsSync("src/database/migrations"),
      "Seeds directory": fs.existsSync("src/database/seeds"),
    };

    Object.entries(dbChecks).forEach(([name, exists]) => {
      if (exists) {
        logger.success(`${name}`);
      } else {
        logger.warning(`${name} - Not found`);
      }
    });

    // Check API infrastructure
    console.log(chalk.cyan.bold("\n🔗 API Infrastructure:"));

    const apiChecks = {
      "API directory": fs.existsSync("src/app/api"),
      "Hooks directory": fs.existsSync("src/hooks"),
      "Types directory": fs.existsSync("src/types"),
    };

    Object.entries(apiChecks).forEach(([name, exists]) => {
      if (exists) {
        logger.success(`${name}`);
      } else {
        logger.warning(`${name} - Not found`);
      }
    });

    // Check environment variables
    console.log(chalk.cyan.bold("\n🔐 Environment Configuration:"));

    const envFile = ".env.local";
    if (fs.existsSync(envFile)) {
      const envContent = fs.readFileSync(envFile, "utf-8");
      const hasDbUrl =
        envContent.includes("DATABASE_URL=") &&
        !envContent.includes("DATABASE_URL=postgresql://username:password");
      const hasApiKey =
        envContent.includes("GOOGLE_GENERATIVE_AI_API_KEY=") &&
        !envContent.includes(
          "GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key"
        );

      if (hasDbUrl) {
        logger.success("DATABASE_URL configured");
      } else {
        logger.warning("DATABASE_URL needs configuration");
      }

      if (hasApiKey) {
        logger.success("GOOGLE_GENERATIVE_AI_API_KEY configured");
      } else {
        logger.warning("GOOGLE_GENERATIVE_AI_API_KEY needs configuration");
      }
    } else {
      logger.error("Environment file not found");
    }

    // Detailed analysis if requested
    if (all) {
      console.log(chalk.cyan.bold("\n📁 Detailed File Analysis:"));

      // Analyze schemas
      const schemasDir = "src/database/schemas";
      if (fs.existsSync(schemasDir)) {
        const schemaFiles = fs
          .readdirSync(schemasDir)
          .filter((file) => file.endsWith(".ts"));
        if (schemaFiles.length > 0) {
          logger.info(`Found ${schemaFiles.length} schema file(s):`);
          schemaFiles.forEach((file) => {
            console.log(`  • ${file}`);
          });
        } else {
          logger.warning("No schema files found");
        }
      }

      // Analyze API endpoints
      const apiDir = "src/app/api";
      if (fs.existsSync(apiDir)) {
        const apiEndpoints = fs
          .readdirSync(apiDir, { withFileTypes: true })
          .filter((dirent) => dirent.isDirectory())
          .map((dirent) => dirent.name);

        if (apiEndpoints.length > 0) {
          logger.info(`Found ${apiEndpoints.length} API endpoint(s):`);
          apiEndpoints.forEach((endpoint) => {
            const routeFile = path.join(apiDir, endpoint, "route.ts");
            if (fs.existsSync(routeFile)) {
              console.log(`  • /api/${endpoint} ✅`);
            } else {
              console.log(`  • /api/${endpoint} ⚠️ (no route.ts)`);
            }
          });
        } else {
          logger.warning("No API endpoints found");
        }
      }

      // Analyze hooks
      const hooksDir = "src/hooks";
      if (fs.existsSync(hooksDir)) {
        const hookFiles = fs
          .readdirSync(hooksDir)
          .filter((file) => file.endsWith(".ts") || file.endsWith(".tsx"));
        if (hookFiles.length > 0) {
          logger.info(`Found ${hookFiles.length} custom hook(s):`);
          hookFiles.forEach((file) => {
            console.log(`  • ${file}`);
          });
        } else {
          logger.warning("No custom hooks found");
        }
      }

      // Analyze Spotify components
      console.log(chalk.cyan.bold("\n⚛️  Spotify Components:"));
      const spotifyComponents = [
        "src/components/spotify-header.tsx",
        "src/components/spotify-sidebar.tsx",
        "src/components/spotify-main-content.tsx",
        "src/components/spotify-player.tsx",
      ];

      spotifyComponents.forEach((component) => {
        const basename = path.basename(component);
        if (fs.existsSync(component)) {
          logger.success(`${basename}`);
        } else {
          logger.error(`${basename} - Missing`);
        }
      });
    }

    // Package.json scripts
    console.log(chalk.cyan.bold("\n📜 Available Scripts:"));

    if (fs.existsSync("package.json")) {
      const packageJson = JSON.parse(fs.readFileSync("package.json", "utf-8"));
      const dbScripts = Object.entries(packageJson.scripts || {}).filter(
        ([script]) => script.startsWith("db:") || script.startsWith("agent:")
      );

      if (dbScripts.length > 0) {
        dbScripts.forEach(([script, command]) => {
          console.log(`  • npm run ${script}`);
        });
      } else {
        logger.warning("No database agent scripts found");
      }
    }

    // Overall status summary
    const overallHealth =
      projectChecks["Next.js project"] &&
      dbChecks["Database directory"] &&
      apiChecks["API directory"] &&
      fs.existsSync(".env.local");

    console.log(chalk.cyan.bold("\n🎯 Overall Status:"));
    if (overallHealth) {
      logger.success("Database agent is ready for use! 🚀");
      console.log(chalk.green("\nYou can start using queries like:"));
      console.log(
        chalk.gray(
          '• npm run agent:query "Can you store the recently played songs in a table"'
        )
      );
    } else {
      logger.warning("Database agent needs initialization");
      console.log(chalk.yellow("\nRun the following to get started:"));
      console.log(chalk.gray("• npm run agent:init"));
    }
  } catch (error) {
    logger.error(
      "Status check failed:",
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
}
