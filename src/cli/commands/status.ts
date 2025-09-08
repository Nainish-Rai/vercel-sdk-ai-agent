import { logger } from "../utils/logger";
import fs from "fs";
import chalk from "chalk";

export async function statusCommand() {
  logger.info("Checking project status...");

  const status = {
    environment: {
      envFile: fs.existsSync(".env.local"),
      drizzleConfig: fs.existsSync("drizzle.config.ts"),
      databaseConnection: fs.existsSync("src/database/connection.ts"),
    },
    database: {
      schemasFolder: fs.existsSync("src/database/schemas"),
      migrationsFolder: fs.existsSync("src/database/migrations"),
      hasSchemas:
        fs.existsSync("src/database/schemas") &&
        fs.readdirSync("src/database/schemas").filter((f) => f.endsWith(".ts"))
          .length > 0,
    },
    api: {
      apiFolder: fs.existsSync("src/app/api"),
      hasEndpoints:
        fs.existsSync("src/app/api") &&
        fs.readdirSync("src/app/api").length > 0,
    },
    spotify: {
      header: fs.existsSync("src/components/spotify-header.tsx"),
      sidebar: fs.existsSync("src/components/spotify-sidebar.tsx"),
      mainContent: fs.existsSync("src/components/spotify-main-content.tsx"),
      player: fs.existsSync("src/components/spotify-player.tsx"),
    },
  };

  console.log("\n" + chalk.bold("🔍 Project Status Report") + "\n");

  // Environment Status
  console.log(chalk.yellow("📁 Environment Setup:"));
  console.log(`  ${status.environment.envFile ? "✅" : "❌"} .env.local file`);
  console.log(
    `  ${status.environment.drizzleConfig ? "✅" : "❌"} Drizzle configuration`
  );
  console.log(
    `  ${
      status.environment.databaseConnection ? "✅" : "❌"
    } Database connection`
  );

  // Database Status
  console.log("\n" + chalk.yellow("🗄️ Database Setup:"));
  console.log(
    `  ${status.database.schemasFolder ? "✅" : "❌"} Schemas folder`
  );
  console.log(
    `  ${status.database.migrationsFolder ? "✅" : "❌"} Migrations folder`
  );
  console.log(
    `  ${status.database.hasSchemas ? "✅" : "❌"} Database schemas created`
  );

  // API Status
  console.log("\n" + chalk.yellow("🔗 API Setup:"));
  console.log(`  ${status.api.apiFolder ? "✅" : "❌"} API folder`);
  console.log(
    `  ${status.api.hasEndpoints ? "✅" : "❌"} API endpoints created`
  );

  // Spotify Components Status
  console.log("\n" + chalk.yellow("🎵 Spotify Components:"));
  console.log(`  ${status.spotify.header ? "✅" : "❌"} Header component`);
  console.log(`  ${status.spotify.sidebar ? "✅" : "❌"} Sidebar component`);
  console.log(
    `  ${status.spotify.mainContent ? "✅" : "❌"} Main content component`
  );
  console.log(`  ${status.spotify.player ? "✅" : "❌"} Player component`);

  // Recommendations
  console.log("\n" + chalk.bold("💡 Recommendations:"));

  if (!status.environment.envFile) {
    console.log("  • Run 'npm run agent:init' to set up environment");
  }

  if (!status.database.hasSchemas) {
    console.log(
      '  • Create database schemas with: npm run agent:query "Create a songs table"'
    );
  }

  if (!status.api.hasEndpoints) {
    console.log(
      '  • Generate API endpoints with: npm run agent:query "Create API for recently played songs"'
    );
  }

  const readyPercentage =
    (Object.values(status).reduce((acc, section) => {
      const sectionReady = Object.values(section).filter(Boolean).length;
      const sectionTotal = Object.values(section).length;
      return acc + sectionReady / sectionTotal;
    }, 0) /
      Object.keys(status).length) *
    100;

  console.log(
    "\n" + chalk.bold(`📊 Overall Readiness: ${Math.round(readyPercentage)}%`)
  );
}
