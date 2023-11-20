import { ResourceTypeSchema } from "@awboost/cfn-resource-schemas/types";
import { readFile, readdir } from "fs/promises";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import { GeneratedOutputDir, SchemaOutputDir } from "./consts.js";
import { IntegrityProps, ResourceNamespace } from "./types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function* getResourceTypeSchemas(): AsyncGenerator<
  ResourceTypeSchema & IntegrityProps
> {
  const specsDir = resolve(__dirname, "../", SchemaOutputDir);
  const files = await readdir(specsDir);

  for (const file of files) {
    if (!file.endsWith(".json")) {
      continue;
    }
    yield JSON.parse(await readFile(join(specsDir, file), "utf8"));
  }
}

export async function* getResourceNamespaces(): AsyncGenerator<
  ResourceNamespace & IntegrityProps
> {
  const specsDir = resolve(__dirname, "../", GeneratedOutputDir);
  const files = await readdir(specsDir);

  for (const file of files) {
    if (!file.endsWith(".json")) {
      continue;
    }
    yield JSON.parse(await readFile(join(specsDir, file), "utf8"));
  }
}
