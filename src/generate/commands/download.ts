import chalk from "chalk";
import { download } from "../util/download.js";

const changes = await download();

for (const change of changes) {
  if (change.type === "added") {
    console.log(`${chalk.green("added")} ${change.fileName}`);
  } else if (change.type === "removed") {
    console.log(`${chalk.red("removed")} ${change.fileName}`);
  } else if (change.type === "updated") {
    console.log(`${chalk.yellow("updated")} ${change.fileName}`);
  }
}

if (!changes.length) {
  console.log(`No changes`);
  process.exit(1);
}
