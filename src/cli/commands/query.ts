import { databaseAgent } from "../../agent/core";
import { createSpinner } from "../utils/spinner";
import { logger } from "../utils/logger";
import chalk from "chalk";

export async function queryCommand(text: string) {
  const spinner = createSpinner("Processing your query...");

  try {
    spinner.start();
    logger.info(`Executing query: "${text}"`);

    const result = await databaseAgent(text);

    spinner.stop();

    logger.success("Query completed successfully!");
    logger.info("\nAgent Response:");
    console.log(chalk.cyan(result.response));

    if (result.steps && result.steps.length > 0) {
      logger.info("\nSteps taken:");
      result.steps.forEach((step, index) => {
        console.log(
          `${index + 1}. ${(step as any).name || "Processing"}: ${
            step.text || "Executing tool..."
          }`
        );
      });
    }

    if (result.usage) {
      logger.debug("\nToken usage:", result.usage);
    }
  } catch (error) {
    spinner.stop();
    if (error instanceof Error) {
      logger.error("Failed to process query:", error.message);
    } else {
      logger.error("Failed to process query:", String(error));
    }
    process.exit(1);
  }
}
