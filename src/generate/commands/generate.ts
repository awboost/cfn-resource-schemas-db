import chalk from "chalk";
import { format } from "util";
import { generate } from "../util/generate.js";

const problems = await generate();
let lastFile: string | undefined;
let errorCount = 0,
  warnCount = 0;

for (const problem of problems) {
  if (problem.fileName !== lastFile) {
    lastFile = problem.fileName;
    console.error("\n" + chalk.underline(chalk.whiteBright(problem.fileName)));
  }
  const message = problem.args
    ? format(problem.message, ...problem.args)
    : problem.message;

  if (problem.level === "error") {
    ++errorCount;
    console.error(
      `  ${chalk.red("error")} ${chalk.gray(problem.pointer)} ${message}`,
    );
  } else if (problem.level === "info") {
    console.error(
      `  ${chalk.cyan("info ")} ${chalk.gray(problem.pointer)} ${message}`,
    );
  } else if (problem.level === "warn") {
    ++warnCount;
    console.error(
      `  ${chalk.yellow("warn ")} ${chalk.gray(problem.pointer)} ${message}`,
    );
  }
}

console.error(`\ncompleted with ${errorCount} errors, ${warnCount} warnings`);

if (errorCount) {
  process.exit(1);
}
