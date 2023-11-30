import chalk from "chalk";
import { writeFile } from "fs/promises";
import { download } from "../util/download.js";

const changes = await download();

for (const change of changes) {
  if (change.type === "added") {
    console.log(`${chalk.green("added")} ${change.fileName}`);
  } else if (change.type === "removed") {
    console.log(`${chalk.red("removed")} ${change.fileName}`);
  } else if (change.type === "updated") {
    console.log(`${chalk.yellow("updated")} ${change.fileName}`);

    if (change.changes) {
      for (const description of change.changes) {
        console.log(`  - ${description}`);
      }
    }
  }
}

if (!changes.length) {
  console.log(`No changes`);
  process.exit(1);
}

const sortedChanges = changes
  .slice()
  .sort((a, b) => a.type.localeCompare(b.type));

let changelog = "";

for (const change of sortedChanges) {
  changelog += `- ${change.type} \`${change.typeName}\`\n`;

  if (change.changes) {
    for (const fileChange of [...change.changes].sort()) {
      changelog += `  - ${fileChange}\n`;
    }
  }
}

await writeFile(`recent-changes.md`, changelog);
