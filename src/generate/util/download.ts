import { fetchResourceSchemas } from "@awboost/cfn-resource-schemas";
import { mkdir, readFile, readdir, unlink, writeFile } from "fs/promises";
import { join } from "path";
import { format } from "prettier";
import { IntegrityProps, addIntegrity } from "./integrity.js";

export const SchemaOutputDir = "schemas";

export type FileChange = {
  type: "added" | "removed" | "updated";
  fileName: string;
};

export async function download(): Promise<FileChange[]> {
  await mkdir(SchemaOutputDir, { recursive: true });
  const existing = new Set(await readdir(SchemaOutputDir));
  const changes: FileChange[] = [];

  for await (const schema of fetchResourceSchemas()) {
    const fileName =
      schema.typeName.replace(/::/g, "-").toLowerCase() + ".json";

    const filepath = join(SchemaOutputDir, fileName);
    existing.delete(fileName);

    const newContents = addIntegrity(schema);

    try {
      const oldContents = JSON.parse(
        await readFile(filepath, "utf8"),
      ) as IntegrityProps;

      if (oldContents.$hash !== newContents.$hash) {
        changes.push({ type: "updated", fileName });
      }
    } catch (err: any) {
      if (err?.code === "ENOENT") {
        changes.push({ type: "added", fileName });
      } else {
        throw err;
      }
    }

    const output = await format(JSON.stringify(newContents), {
      filepath,
    });
    await writeFile(filepath, output);
  }

  for (const fileName of existing) {
    changes.push({ type: "removed", fileName });
    await unlink(join(SchemaOutputDir, fileName));
  }

  return changes;
}
