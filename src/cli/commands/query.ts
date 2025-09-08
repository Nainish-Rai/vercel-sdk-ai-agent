import { databaseAgent } from "../../agent/core";
import { createSpinner } from "../utils/spinner";
import { logger } from "../utils/logger";
import chalk from "chalk";

interface QueryOptions {
  verbose?: boolean;
  dryRun?: boolean;
}

export async function queryCommand(text: string, options: QueryOptions = {}) {
  const { verbose, dryRun } = options;

  // Display query info
  console.log(chalk.cyan.bold("\n🎯 Query Received:"));
  console.log(chalk.white(`"${text}"`));

  if (dryRun) {
    logger.warning("Dry run mode: No actual changes will be made");
  }

  const spinner = createSpinner("Processing your database query...");

  try {
    spinner.start();

    // Add dry run context to the prompt if needed
    const enhancedPrompt = dryRun
      ? `${text}\n\nNOTE: This is a dry run. Please explain what you would do but don't actually execute any file changes or database operations.`
      : text;

    logger.info(`\nExecuting query: "${text}"`);

    const result = await databaseAgent(enhancedPrompt);

    spinner.succeed("Query completed successfully!");

    // Display agent response
    console.log(chalk.cyan.bold("\n🤖 Agent Response:"));
    console.log(chalk.white(result.response));

    // Display steps if verbose mode or if there are interesting steps
    if (
      (verbose || result.steps.length > 3) &&
      result.steps &&
      result.steps.length > 0
    ) {
      console.log(chalk.yellow.bold("\n📋 Execution Steps:"));
      result.steps.forEach((step, index) => {
        const stepNum = chalk.cyan(`[${index + 1}]`);
        // Fix: Use correct property names for step object
        const stepType = chalk.magenta((step as any).toolName || "processing");
        const stepResult = (step as any).result;
        const stepDesc = stepResult
          ? typeof stepResult === "object" && stepResult.success !== undefined
            ? stepResult.success
              ? chalk.green("✅ Success")
              : chalk.red("❌ Failed")
            : "Completed"
          : "Processing...";

        console.log(`${stepNum} ${stepType}: ${stepDesc}`);

        if (verbose && stepResult && typeof stepResult === "object") {
          // Show additional details in verbose mode
          if (stepResult.path) {
            console.log(`    📁 File: ${stepResult.path}`);
          }
          if (stepResult.tableName) {
            console.log(`    🗄️ Table: ${stepResult.tableName}`);
          }
          if (stepResult.endpoint) {
            console.log(`    🔗 Endpoint: ${stepResult.endpoint}`);
          }
        }
      });
    }

    // Display usage statistics
    if (result.usage) {
      console.log(chalk.gray.bold("\n📊 Usage Statistics:"));
      // Fix: Access usage properties that actually exist on AI SDK v5 LanguageModelV2Usage
      console.log(
        chalk.gray(
          `Prompt tokens: ${(result.usage as any).promptTokens || "N/A"}`
        )
      );
      console.log(
        chalk.gray(
          `Completion tokens: ${
            (result.usage as any).completionTokens || "N/A"
          }`
        )
      );
      console.log(
        chalk.gray(
          `Total tokens: ${(result.usage as any).totalTokens || "N/A"}`
        )
      );
    }

    // Show next steps or recommendations
    console.log(chalk.green.bold("\n✨ Next Steps:"));
    if (dryRun) {
      console.log(
        chalk.white(
          "• Run the same command without --dry-run to execute the changes"
        )
      );
    } else {
      console.log(chalk.white("• Test your new API endpoints"));
      console.log(
        chalk.white("• Check the updated components in your browser")
      );
      console.log(chalk.white("• Run the database migrations if needed"));
    }
  } catch (error) {
    spinner.fail("Failed to process query");

    logger.error("Query execution failed:");

    if (error instanceof Error) {
      console.log(chalk.red(error.message));

      // Provide helpful suggestions based on error type
      if (error.message.includes("API key")) {
        logger.info(
          "💡 Make sure GOOGLE_GENERATIVE_AI_API_KEY is set in your .env.local file"
        );
      } else if (
        error.message.includes("network") ||
        error.message.includes("fetch")
      ) {
        logger.info("💡 Check your internet connection and try again");
      } else if (
        error.message.includes("database") ||
        error.message.includes("DATABASE_URL")
      ) {
        logger.info(
          "💡 Make sure DATABASE_URL is configured in your .env.local file"
        );
      }
    } else {
      console.log(chalk.red(String(error)));
    }

    process.exit(1);
  }
}
