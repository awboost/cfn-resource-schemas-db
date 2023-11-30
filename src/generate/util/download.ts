import { fetchResourceSchemas } from "@awboost/cfn-resource-schemas";
import { ResourceTypeSchema } from "@awboost/cfn-resource-schemas/types";
import { mkdir, readFile, readdir, unlink, writeFile } from "fs/promises";
import { canonicalize } from "json-canonicalize";
import { join } from "path";
import { format } from "prettier";
import { SchemaOutputDir } from "../../consts.js";
import { IntegrityProps } from "../../types.js";
import { schemaDiff } from "./diff.js";
import { addIntegrity } from "./integrity.js";

export type FileChange = {
  type: "added" | "removed" | "updated";
  typeName: string;
  fileName: string;
  changes?: string[];
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
    let changed = false;

    try {
      const oldContents = JSON.parse(
        await readFile(filepath, "utf8"),
      ) as ResourceTypeSchema & IntegrityProps;

      if (oldContents.$hash !== newContents.$hash) {
        changes.push({
          type: "updated",
          fileName,
          typeName: newContents.typeName,
          changes: schemaDiff(oldContents, newContents),
        });
        changed = true;
      }
    } catch (err: any) {
      if (err?.code === "ENOENT") {
        changes.push({
          type: "added",
          fileName,
          typeName: newContents.typeName,
        });
        changed = true;
      } else {
        throw err;
      }
    }

    if (changed) {
      const output = await format(canonicalize(newContents), {
        filepath,
      });
      await writeFile(filepath, output);
    }
  }

  for (const fileName of existing) {
    changes.push({
      type: "removed",
      fileName,
      typeName: JSON.parse(
        await readFile(join(SchemaOutputDir, fileName), "utf8"),
      ).typeName,
    });
    await unlink(join(SchemaOutputDir, fileName));
  }

  return changes;
}
