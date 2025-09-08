import { databaseAgent } from "../agent/core";
import { logger } from "../cli/utils/logger";
import { codingAgent } from "./agent";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function testAgent() {
  logger.info("🧪 Testing database agent setup...");

  try {
    const result = await databaseAgent(
      "Test the agent setup and list the current project files"
    );

    logger.success("Agent test completed!");
    logger.info("Response:", result.response);

    if (result.steps && result.steps.length > 0) {
      logger.info(`Executed ${result.steps.length} steps successfully`);
    }
  } catch (error) {
    if (error instanceof Error) {
      logger.error("Agent test failed:", error.message);

      if (error.message.includes("API key")) {
        logger.warn(
          "Make sure you have set up your GOOGLE_GENERATIVE_AI_API_KEY in .env.local"
        );
      }
    } else {
      logger.error("Agent test failed:", error);
    }

    process.exit(1);
  }
}

testAgent();

// Test the database schema agent
codingAgent(
  "Create a users table schema with id (uuid), email (varchar), name (varchar), created_at (timestamp), and is_active (boolean). Then generate a migration for it."
)
  .then(console.log)
  .catch(console.error);
