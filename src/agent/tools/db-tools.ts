import { tool } from "ai";
import { z } from "zod";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";

const execAsync = promisify(exec);

export const dbTools = {
  create_schema: tool({
    description:
      "Generate a Drizzle ORM schema file for the specified table structure.",
    inputSchema: z.object({
      tableName: z.string().describe("Name of the table to create"),
      fields: z
        .array(
          z.object({
            name: z.string(),
            type: z.string(),
            constraints: z.array(z.string()).optional(),
          })
        )
        .describe("Array of field definitions"),
      schemaPath: z
        .string()
        .default("src/database/schemas")
        .describe("Path where schema file should be created"),
    }),
    execute: async ({ tableName, fields, schemaPath }) => {
      console.log(`🗃️ Creating schema for table: ${tableName}`);

      try {
        // Generate Drizzle schema content
        const imports = `import { pgTable, serial, text, timestamp, varchar, integer, boolean } from 'drizzle-orm/pg-core';`;

        const fieldDefinitions = fields
          .map((field) => {
            let definition = `  ${field.name}: `;

            switch (field.type) {
              case "string":
              case "varchar":
                definition += "varchar(255)";
                break;
              case "text":
                definition += "text()";
                break;
              case "number":
              case "integer":
                definition += "integer()";
                break;
              case "boolean":
                definition += "boolean()";
                break;
              case "timestamp":
                definition += "timestamp()";
                break;
              default:
                definition += "text()";
            }

            if (field.constraints) {
              field.constraints.forEach((constraint) => {
                switch (constraint) {
                  case "notNull":
                    definition += ".notNull()";
                    break;
                  case "primaryKey":
                    definition += ".primaryKey()";
                    break;
                  case "unique":
                    definition += ".unique()";
                    break;
                }
              });
            }

            return definition + ",";
          })
          .join("\n");

        const schemaContent = `${imports}

export const ${tableName} = pgTable('${tableName}', {
  id: serial('id').primaryKey(),
${fieldDefinitions}
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type ${
          tableName.charAt(0).toUpperCase() + tableName.slice(1)
        } = typeof ${tableName}.$inferSelect;
export type New${
          tableName.charAt(0).toUpperCase() + tableName.slice(1)
        } = typeof ${tableName}.$inferInsert;
`;

        // Ensure directory exists
        if (!fs.existsSync(schemaPath)) {
          fs.mkdirSync(schemaPath, { recursive: true });
        }

        const filePath = `${schemaPath}/${tableName}.ts`;
        fs.writeFileSync(filePath, schemaContent);

        return {
          success: true,
          tableName,
          path: filePath,
          fieldsCreated: fields.length,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          tableName,
        };
      }
    },
  }),

  run_migration: tool({
    description: "Execute database migrations using Drizzle Kit.",
    inputSchema: z.object({
      action: z
        .enum(["generate", "migrate", "push"])
        .describe("Migration action to perform"),
    }),
    execute: async ({ action }) => {
      console.log(`🚀 Running migration: ${action}`);
      try {
        const { stdout, stderr } = await execAsync(`npx drizzle-kit ${action}`);
        return { success: true, output: stdout, error: stderr, action };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          action,
        };
      }
    },
  }),

  seed_database: tool({
    description: "Populate database tables with sample data.",
    inputSchema: z.object({
      tableName: z.string().describe("Name of the table to seed"),
      sampleData: z
        .array(z.record(z.any()))
        .describe("Array of sample data objects"),
    }),
    execute: async ({ tableName, sampleData }) => {
      console.log(
        `🌱 Seeding table: ${tableName} with ${sampleData.length} records`
      );

      try {
        // Generate seed file content
        const seedContent = `import { db } from '../connection';
import { ${tableName} } from '../schemas/${tableName}';

export async function seed${
          tableName.charAt(0).toUpperCase() + tableName.slice(1)
        }() {
  console.log('Seeding ${tableName}...');

  const data = ${JSON.stringify(sampleData, null, 2)};

  await db.insert(${tableName}).values(data);

  console.log('✅ ${tableName} seeded successfully');
}
`;

        const seedPath = `src/database/seeds/${tableName}-seed.ts`;
        const seedDir = "src/database/seeds";

        if (!fs.existsSync(seedDir)) {
          fs.mkdirSync(seedDir, { recursive: true });
        }

        fs.writeFileSync(seedPath, seedContent);

        return {
          success: true,
          tableName,
          recordsInserted: sampleData.length,
          seedFilePath: seedPath,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          tableName,
        };
      }
    },
  }),

  create_database_connection: tool({
    description: "Create database connection file using Drizzle ORM.",
    inputSchema: z.object({
      connectionType: z
        .enum(["postgres", "supabase"])
        .default("postgres")
        .describe("Type of database connection"),
    }),
    execute: async ({ connectionType }) => {
      console.log(`🔗 Creating ${connectionType} database connection`);

      try {
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

        const connectionPath = "src/database/connection.ts";
        fs.writeFileSync(connectionPath, connectionContent);

        return {
          success: true,
          connectionType,
          path: connectionPath,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  }),
};
