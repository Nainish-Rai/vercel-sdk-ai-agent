import { tool } from "ai";
import { z } from "zod";
import fs from "fs";
import path from "path";

export const fileTools = {
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
        console.log(`📁 Listing files at '${targetPath}'`);
        const output = fs.readdirSync(targetPath, { recursive: false });
        return { path: targetPath, output };
      } catch (e) {
        console.error(`❌ Error listing files:`, e);
        return { error: e };
      }
    },
  }),

  read_file: tool({
    description:
      "Read the contents of a given relative file path. Use this when you want to see what's inside a file.",
    inputSchema: z.object({
      path: z
        .string()
        .describe("The relative path of a file in the working directory."),
    }),
    execute: async ({ path }) => {
      try {
        console.log(`📖 Reading file at '${path}'`);
        const output = fs.readFileSync(path, "utf-8");
        return { path, output };
      } catch (error) {
        console.error(
          `❌ Error reading file at ${path}:`,
          error instanceof Error ? error.message : String(error)
        );
        return {
          path,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  }),

  edit_file: tool({
    description:
      "Make edits to a text file or create a new file. Replaces 'old_str' with 'new_str' in the given file.",
    inputSchema: z.object({
      path: z.string().describe("The path to the file"),
      old_str: z
        .string()
        .nullable()
        .describe("Text to search for - must match exactly"),
      new_str: z.string().describe("Text to replace old_str with"),
    }),
    execute: async ({ path, old_str, new_str }) => {
      try {
        const fileExists = fs.existsSync(path);
        if (fileExists && old_str !== null) {
          console.log(`✏️ Editing file '${path}'`);
          const fileContents = fs.readFileSync(path, "utf-8");
          const newContents = fileContents.replace(old_str, new_str);
          fs.writeFileSync(path, newContents);
          return { path, success: true, action: "edit" };
        } else {
          console.log(`📝 Creating file '${path}'`);
          // Ensure directory exists
          const dir = path.split("/").slice(0, -1).join("/");
          if (dir && !fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          fs.writeFileSync(path, new_str);
          return { path, success: true, action: "create" };
        }
      } catch (e) {
        console.error(`❌ Error editing file ${path}:`, e);
        return { error: e, success: false };
      }
    },
  }),

  analyze_project_structure: tool({
    description:
      "Analyze the current Next.js project structure to understand components, pages, and architecture.",
    inputSchema: z.object({
      focus: z
        .string()
        .optional()
        .describe("Optional focus area like 'components', 'pages', 'api'"),
    }),
    execute: async ({ focus }) => {
      console.log(
        `🔍 Analyzing project structure${focus ? ` (focus: ${focus})` : ""}`
      );

      try {
        const analysis = {
          hasNextApp: fs.existsSync("src/app"),
          hasComponents: fs.existsSync("src/components"),
          hasDatabase: fs.existsSync("src/database"),
          spotifyComponents: {
            header: fs.existsSync("src/components/spotify-header.tsx"),
            sidebar: fs.existsSync("src/components/spotify-sidebar.tsx"),
            mainContent: fs.existsSync(
              "src/components/spotify-main-content.tsx"
            ),
            player: fs.existsSync("src/components/spotify-player.tsx"),
          },
          packageJson: fs.existsSync("package.json"),
          tsConfig: fs.existsSync("tsconfig.json"),
        };

        return { analysis, focus };
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : String(error),
          focus,
        };
      }
    },
  }),
};
