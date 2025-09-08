import { generateText, stepCountIs, tool } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";

export async function codingAgent(prompt: string) {
  const result = await generateText({
    model: google("gemini-2.5-flash-lite"),
    prompt,
    system: `You are a coding agent specialized in Next.js/TypeScript projects with Drizzle ORM.
    You can:
    - Create and modify database schemas using Drizzle ORM
    - Generate and run database migrations
    - Read and analyze existing code
    - Make file modifications
    - Work with PostgreSQL databases

    IMPORTANT: When users mention multiple entities or categories (like "Made for you" and "Popular albums"),
    you should create SEPARATE tables for each distinct entity type. Don't combine different concepts into one table.

    For music/playlist related requests:
    - "Made for you" should be a separate table (made_for_you_playlists)
    - "Popular albums" should be a separate table (popular_albums)
    - "Recently played" should be a separate table (recently_played_songs)
    - Each should have appropriate fields for their specific use case

    Always analyze the request for multiple entities FIRST, then plan the database schema accordingly.
    Create schemas for ALL identified entities, not just one.

    Always follow TypeScript best practices and Drizzle ORM conventions.
    Your responses must be concise and actionable.`,
    stopWhen: stepCountIs(15),
    tools: {
      list_files: tool({
        description:
          "List files and directories at a given path. If no path is provided, lists files in the current directory.",
        inputSchema: z.object({
          path: z
            .string()
            .nullable()
            .describe(
              "Optional relative path to list files from. Defaults to current directory if not provided."
            ),
        }),
        execute: async ({ path: generatedPath }) => {
          if (generatedPath === ".git" || generatedPath === "node_modules") {
            return { error: "You cannot read the path: " + generatedPath };
          }
          const targetPath = generatedPath?.trim() ? generatedPath : ".";
          try {
            console.log(`Listing files at '${targetPath}'`);
            const output = fs.readdirSync(targetPath, {
              recursive: false,
            });
            return { path: targetPath, output };
          } catch (e) {
            console.error(`Error listing files:`, e);
            return { error: e };
          }
        },
      }),

      read_file: tool({
        description:
          "Read the contents of a given relative file path. Use this when you want to see what's inside a file. Do not use this with directory names.",
        inputSchema: z.object({
          path: z
            .string()
            .describe("The relative path of a file in the working directory."),
        }),
        execute: async ({ path }) => {
          try {
            console.log(`Reading file at '${path}'`);
            const output = fs.readFileSync(path, "utf-8");
            return { path, output };
          } catch (error) {
            console.error(`Error reading file at ${path}:`, error.message);
            return { path, error: error.message };
          }
        },
      }),

      edit_file: tool({
        description:
          "Make edits to a text file or create a new file. Replaces 'old_str' with 'new_str' in the given file. 'old_str' and 'new_str' MUST be different from each other. If the file specified with path doesn't exist, it will be created.",
        inputSchema: z.object({
          path: z.string().describe("The path to the file"),
          old_str: z
            .string()
            .nullable()
            .describe(
              "Text to search for - must match exactly and must only have one match exactly"
            ),
          new_str: z.string().describe("Text to replace old_str with"),
        }),
        execute: async ({ path, old_str, new_str }) => {
          try {
            const fileExists = fs.existsSync(path);
            if (fileExists && old_str !== null) {
              console.log(`Editing file '${path}'`);
              const fileContents = fs.readFileSync(path, "utf-8");
              const newContents = fileContents.replace(old_str, new_str);
              fs.writeFileSync(path, newContents);
              return { path, success: true, action: "edit" };
            } else {
              console.log(`Creating file '${path}'`);
              // Ensure directory exists
              const dir = path.dirname(path);
              if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
              }
              fs.writeFileSync(path, new_str);
              return { path, success: true, action: "create" };
            }
          } catch (e) {
            console.error(`Error editing file ${path}:`, e);
            return { error: e, success: false };
          }
        },
      }),

      create_schema: tool({
        description:
          "Create a new Drizzle schema file in the schemas directory. This will create a TypeScript file with Drizzle table definitions.",
        inputSchema: z.object({
          schemaName: z
            .string()
            .describe("Name of the schema (e.g., 'users', 'posts')"),
          tableDefinition: z
            .string()
            .describe("Complete Drizzle table definition code"),
        }),
        execute: async ({ schemaName, tableDefinition }) => {
          try {
            const schemaPath = `src/database/schemas/${schemaName}.ts`;
            console.log(`Creating schema file '${schemaPath}'`);

            const schemaContent = `import { pgTable, text, timestamp, uuid, varchar, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

${tableDefinition}

// Zod schemas for validation
export const insert${
              schemaName.charAt(0).toUpperCase() + schemaName.slice(1)
            }Schema = createInsertSchema(${schemaName});
export const select${
              schemaName.charAt(0).toUpperCase() + schemaName.slice(1)
            }Schema = createSelectSchema(${schemaName});

export type Insert${
              schemaName.charAt(0).toUpperCase() + schemaName.slice(1)
            } = typeof ${schemaName}.$inferInsert;
export type Select${
              schemaName.charAt(0).toUpperCase() + schemaName.slice(1)
            } = typeof ${schemaName}.$inferSelect;
`;

            fs.writeFileSync(schemaPath, schemaContent);
            return { path: schemaPath, success: true, action: "create_schema" };
          } catch (e) {
            console.error(`Error creating schema:`, e);
            return { error: e, success: false };
          }
        },
      }),

      generate_migration: tool({
        description:
          "Generate a new migration based on schema changes using drizzle-kit generate command.",
        inputSchema: z.object({
          migrationName: z
            .string()
            .optional()
            .describe("Optional name for the migration"),
        }),
        execute: async ({ migrationName }) => {
          return new Promise((resolve) => {
            console.log("Generating migration...");
            const command = migrationName
              ? `npm run db:generate -- --name ${migrationName}`
              : `npm run db:generate`;

            const child = spawn(command, { shell: true, stdio: "pipe" });

            let output = "";
            let error = "";

            child.stdout.on("data", (data) => {
              output += data.toString();
            });

            child.stderr.on("data", (data) => {
              error += data.toString();
            });

            child.on("close", (code) => {
              if (code === 0) {
                resolve({
                  success: true,
                  output,
                  action: "generate_migration",
                });
              } else {
                resolve({
                  success: false,
                  error,
                  output,
                  action: "generate_migration",
                });
              }
            });
          });
        },
      }),

      run_migration: tool({
        description:
          "Run pending migrations using drizzle-kit migrate command.",
        inputSchema: z.object({}),
        execute: async () => {
          return new Promise((resolve) => {
            console.log("Running migrations...");
            const child = spawn("npm run db:migrate", {
              shell: true,
              stdio: "pipe",
            });

            let output = "";
            let error = "";

            child.stdout.on("data", (data) => {
              output += data.toString();
            });

            child.stderr.on("data", (data) => {
              error += data.toString();
            });

            child.on("close", (code) => {
              if (code === 0) {
                resolve({ success: true, output, action: "run_migration" });
              } else {
                resolve({
                  success: false,
                  error,
                  output,
                  action: "run_migration",
                });
              }
            });
          });
        },
      }),

      open_db_studio: tool({
        description: "Open Drizzle Studio to view and manage the database.",
        inputSchema: z.object({}),
        execute: async () => {
          return new Promise((resolve) => {
            console.log("Starting Drizzle Studio...");
            const child = spawn("npm run db:studio", {
              shell: true,
              stdio: "pipe",
            });

            let output = "";

            child.stdout.on("data", (data) => {
              output += data.toString();
            });

            // Give it a moment to start
            setTimeout(() => {
              resolve({
                success: true,
                output:
                  "Drizzle Studio is starting. Check your browser at https://local.drizzle.studio",
                action: "open_db_studio",
              });
            }, 2000);
          });
        },
      }),

      analyze_schema: tool({
        description:
          "Analyze existing schema files to understand the current database structure.",
        inputSchema: z.object({
          schemaName: z
            .string()
            .optional()
            .describe("Optional specific schema to analyze"),
        }),
        execute: async ({ schemaName }) => {
          try {
            const schemasDir = "src/database/schemas";
            const files = fs.readdirSync(schemasDir);

            if (schemaName) {
              const schemaFile = `${schemaName}.ts`;
              if (files.includes(schemaFile)) {
                const content = fs.readFileSync(
                  path.join(schemasDir, schemaFile),
                  "utf-8"
                );
                return {
                  success: true,
                  schema: schemaName,
                  content,
                  action: "analyze_schema",
                };
              } else {
                return {
                  success: false,
                  error: `Schema '${schemaName}' not found`,
                  action: "analyze_schema",
                };
              }
            } else {
              const schemas = {};
              for (const file of files.filter((f) => f.endsWith(".ts"))) {
                const name = file.replace(".ts", "");
                const content = fs.readFileSync(
                  path.join(schemasDir, file),
                  "utf-8"
                );
                schemas[name] = content;
              }
              return {
                success: true,
                schemas,
                schemaFiles: files.filter((f) => f.endsWith(".ts")),
                action: "analyze_schema",
              };
            }
          } catch (e) {
            console.error(`Error analyzing schemas:`, e);
            return { error: e, success: false, action: "analyze_schema" };
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
          console.log(`Analyzing request: "${userRequest}"`);

          // Common patterns for multiple entities
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

          if (
            request.includes("recently played") ||
            request.includes("recent")
          ) {
            entities.push({
              name: "recently_played_songs",
              description: "Songs recently played by the user",
              fields: [
                { name: "title", type: "varchar", constraints: ["notNull"] },
                { name: "artist", type: "varchar", constraints: ["notNull"] },
                { name: "album", type: "varchar" },
                { name: "duration", type: "integer" },
                {
                  name: "playedAt",
                  type: "timestamp",
                  constraints: ["notNull"],
                },
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
                `Creating schema file '${schemaPath}' for ${entity.description}`
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
    },
  });

  return {
    response: result.text,
  };
}
