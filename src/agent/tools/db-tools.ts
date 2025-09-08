import { tool } from "ai";
import { z } from "zod";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";

const execAsync = promisify(exec);

export const dbTools = {
  create_schema: tool({
    description:
      "Generate a Drizzle ORM schema file for the specified table structure. This is step 1 of the database setup process - you MUST continue with generating and running migrations after this.",
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
          nextStep:
            "You must now run migrations to apply this schema to the database. Use the run_migration tool with action 'generate' followed by action 'migrate'.",
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

  analyze_request: tool({
    description:
      "Analyze a user request to identify multiple entities that need separate database tables",
    inputSchema: z.object({
      userRequest: z.string().describe("The user's request to analyze"),
    }),
    execute: async ({ userRequest }) => {
      console.log(`🔍 Analyzing request: "${userRequest}"`);

      const entities = [];
      const request = userRequest.toLowerCase();

      // Check for music/playlist entities
      if (request.includes("made for you")) {
        entities.push({
          name: "made_for_you_playlists",
          description: "Personalized playlists curated for the user",
          fields: [
            { name: "title", type: "varchar", constraints: ["notNull"] },
            { name: "description", type: "text" },
            { name: "imageUrl", type: "varchar" },
            { name: "playlistType", type: "varchar" },
            { name: "trackCount", type: "integer" },
          ],
        });
      }

      if (
        request.includes("popular albums") ||
        request.includes("popular album")
      ) {
        entities.push({
          name: "popular_albums",
          description: "Popular albums trending or featured",
          fields: [
            { name: "title", type: "varchar", constraints: ["notNull"] },
            { name: "artist", type: "varchar", constraints: ["notNull"] },
            { name: "imageUrl", type: "varchar" },
            { name: "releaseYear", type: "integer" },
            { name: "genre", type: "varchar" },
            { name: "popularity", type: "integer" },
          ],
        });
      }

      if (request.includes("recently played") || request.includes("recent")) {
        entities.push({
          name: "recently_played_songs",
          description: "Songs recently played by the user",
          fields: [
            { name: "title", type: "varchar", constraints: ["notNull"] },
            { name: "artist", type: "varchar", constraints: ["notNull"] },
            { name: "album", type: "varchar" },
            { name: "duration", type: "integer" },
            { name: "playedAt", type: "timestamp", constraints: ["notNull"] },
          ],
        });
      }

      // Fallback for generic album requests
      if (
        (request.includes("album") && entities.length === 0) ||
        (request.includes("albums") && entities.length === 0)
      ) {
        entities.push({
          name: "albums",
          description: "General album information",
          fields: [
            { name: "title", type: "varchar", constraints: ["notNull"] },
            { name: "artist", type: "varchar", constraints: ["notNull"] },
            { name: "imageUrl", type: "varchar" },
            { name: "category", type: "varchar" },
          ],
        });
      }

      return {
        success: true,
        entitiesFound: entities.length,
        entities,
        recommendation:
          entities.length > 1
            ? "Multiple entities detected. Create separate tables for each."
            : "Single entity detected.",
      };
    },
  }),

  create_multiple_schemas: tool({
    description:
      "Create multiple Drizzle schema files for different entities at once",
    inputSchema: z.object({
      entities: z
        .array(
          z.object({
            name: z.string(),
            description: z.string(),
            fields: z.array(
              z.object({
                name: z.string(),
                type: z.string(),
                constraints: z.array(z.string()).optional(),
              })
            ),
          })
        )
        .describe("Array of entities to create schemas for"),
    }),
    execute: async ({ entities }) => {
      const results = [];

      for (const entity of entities) {
        try {
          const schemaPath = `src/database/schemas/${entity.name}.ts`;
          console.log(
            `📝 Creating schema file '${schemaPath}' for ${entity.description}`
          );

          // Generate field definitions
          const fieldDefinitions = entity.fields
            .map((field) => {
              let definition = `  ${field.name}: `;

              switch (field.type) {
                case "varchar":
                  definition += "varchar(255)";
                  break;
                case "text":
                  definition += "text()";
                  break;
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
                  if (constraint === "notNull") definition += ".notNull()";
                  if (constraint === "primaryKey")
                    definition += ".primaryKey()";
                });
              }

              return definition + ",";
            })
            .join("\n");

          const tableName = entity.name;
          const capitalizedName =
            tableName.charAt(0).toUpperCase() + tableName.slice(1);

          const schemaContent = `import { pgTable, serial, text, timestamp, varchar, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const ${tableName} = pgTable("${tableName}", {
  id: serial("id").primaryKey(),
${fieldDefinitions}
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Zod schemas for validation
export const insert${capitalizedName}Schema = createInsertSchema(${tableName});
export const select${capitalizedName}Schema = createSelectSchema(${tableName});

export type Insert${capitalizedName} = typeof ${tableName}.$inferInsert;
export type Select${capitalizedName} = typeof ${tableName}.$inferSelect;
`;

          // Ensure directory exists
          const schemaDir = "src/database/schemas";
          if (!fs.existsSync(schemaDir)) {
            fs.mkdirSync(schemaDir, { recursive: true });
          }

          fs.writeFileSync(schemaPath, schemaContent);
          results.push({
            tableName,
            path: schemaPath,
            success: true,
            description: entity.description,
          });
        } catch (e) {
          console.error(`Error creating schema for ${entity.name}:`, e);
          results.push({
            tableName: entity.name,
            success: false,
            error: e.message,
          });
        }
      }

      return {
        success: results.every((r) => r.success),
        results,
        totalCreated: results.filter((r) => r.success).length,
        action: "create_multiple_schemas",
      };
    },
  }),
};
