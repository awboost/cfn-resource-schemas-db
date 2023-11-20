import { readFile, readdir, writeFile } from "fs/promises";
import { canonicalize } from "json-canonicalize";
import { join } from "path";
import { format } from "prettier";
import { SchemaOutputDir } from "../../consts.js";

const files = await readdir(SchemaOutputDir);

for (const file of files) {
  const filepath = join(SchemaOutputDir, file);
  const contents = JSON.parse(await readFile(filepath, "utf8"));
  const output = await format(canonicalize(contents), { filepath });
  await writeFile(filepath, output);
}
