import { ResourceTypeSchema } from "@awboost/cfn-resource-schemas/types";
import { mkdir, readdir, unlink, writeFile } from "fs/promises";
import JsonPointerRaw from "json-pointer";
import { JSONSchema7, JSONSchema7Definition } from "json-schema";
import { join, resolve } from "path";
import { format } from "prettier";
import { GeneratedOutputDir } from "../../consts.js";
import { getResourceTypeSchemas } from "../../data.js";
import {
  ArrayType,
  ObjectType,
  RecordType,
  ResourceNamespace,
  TypeDefinition,
  UnionType,
} from "../../types.js";
import { addIntegrity } from "./integrity.js";
import { Problem, ProblemContext } from "./problems.js";

type DocumentationProps = {
  description?: string;
  documentationUrl?: string;
};

function assertSchema(
  schema: JSONSchema7Definition,
  ctx: ProblemContext<any>,
): asserts schema is JSONSchema7 {
  // the type definitions allow for boolean but it isn't provided in the spec
  if (typeof schema === "boolean") {
    ctx.throw(`unexpected boolean`);
  }
}

function convertArrayType(
  schema: JSONSchema7 & DocumentationProps,
  ctx: ProblemContext<JSONSchema7>,
): ArrayType {
  let itemType: TypeDefinition | undefined;
  if (schema.items) {
    if (Array.isArray(schema.items)) {
      itemType = convertArrayToUnionType(
        schema.items,
        ctx.child.items().as<JSONSchema7Definition[]>(),
      );
    } else {
      assertSchema(schema.items, ctx.child.items());
      itemType = convertType(schema.items, ctx.child.items().as<JSONSchema7>());
    }
  }

  return {
    type: "array",
    description: schema.description,
    documentationUrl: schema.documentationUrl,
    itemType,
    maxLength: schema.maxItems,
    minLength: schema.minItems,
  };
}

function convertObjectType(
  schema: JSONSchema7 & DocumentationProps,
  ctx: ProblemContext<JSONSchema7>,
  allowedProperties?: string[],
): ObjectType {
  const def: ObjectType = {
    type: "object",
    description: schema.description,
    documentationUrl: schema.documentationUrl,
    properties: [],
  };
  if (schema.properties) {
    for (const [name, value] of Object.entries(schema.properties)) {
      if (allowedProperties && !allowedProperties.includes(name)) {
        continue;
      }
      assertSchema(value, ctx.child.properties[name]());
      const type = convertType(
        value,
        ctx.child.properties[name]().as<JSONSchema7>(),
      );
      if (type) {
        def.properties.push({
          name,
          description: value.description,
          optional: !schema.required?.includes(name),
          type,
        });
      }
    }
  } else {
    ctx.child.properties().error(`object type missing properties`);
  }
  return def;
}

function convertRecordType(
  schema: JSONSchema7 & DocumentationProps,
  ctx: ProblemContext<JSONSchema7>,
): RecordType {
  const def: RecordType = {
    type: "record",
    description: schema.description,
    documentationUrl: schema.documentationUrl,
  };
  if (schema.patternProperties) {
    def.valueType = convertArrayToUnionType(
      Object.values(schema.patternProperties),
      ctx.child.patternProperties().override<JSONSchema7Definition[]>(),
    );
  }
  return def;
}

function convertUnionType(
  schema: JSONSchema7 & DocumentationProps,
  ctx: ProblemContext<JSONSchema7>,
): TypeDefinition {
  const overrides = {
    description: schema.description,
    documentationUrl: schema.documentationUrl,
    type: schema.type,
  };
  for (const key in overrides) {
    if (!(overrides as any)[key]) {
      delete (overrides as any)[key];
    }
  }
  if (schema.oneOf) {
    return convertArrayToUnionType(schema.oneOf, ctx.child.oneOf(), overrides);
  } else if (schema.anyOf) {
    return convertArrayToUnionType(schema.anyOf, ctx.child.anyOf(), overrides);
  } else {
    ctx.throw(`expected "anyOf" or "oneOf"`);
  }
}

function convertArrayToUnionType(
  schemas: JSONSchema7Definition[],
  ctx: ProblemContext<JSONSchema7Definition[]>,
  overrides?: DocumentationProps & { type?: JSONSchema7["type"] },
): TypeDefinition {
  if (schemas.length === 0) {
    ctx.error(`empty union`);
  } else if (schemas.length === 1) {
    const element = schemas[0];
    assertSchema(element, ctx.child[0]());
    const type = convertType(
      { ...element, ...overrides },
      ctx.child[0]().as<JSONSchema7>(),
    );
    if (type) {
      return type;
    } else {
      ctx.error(`unable to process union type`);
    }
  }

  const ret: UnionType = {
    description: overrides?.description,
    documentationUrl: overrides?.documentationUrl,
    type: "union",
    types: [],
  };

  for (let i = 0; i < schemas.length; ++i) {
    const element = schemas[i];
    const elementPtr = ctx.child[i]();

    assertSchema(element, elementPtr);
    const type = convertType(
      { ...element, ...overrides },
      elementPtr.as<JSONSchema7>(),
    );
    if (!type) {
      //Logger.error(`${elementPtr}: couldn't process union element`);
    } else {
      ret.types.push(type);
    }
  }

  return ret;
}

function onlyConstraints(
  schema: JSONSchema7Definition | JSONSchema7Definition[],
  ctx: ProblemContext<JSONSchema7Definition>,
): boolean {
  if (Array.isArray(schema)) {
    return !schema.some(
      (x, i) =>
        !onlyConstraints(x, (ctx as ProblemContext<JSONSchema7[]>).child[i]()),
    );
  }
  assertSchema(schema, ctx);
  const keys = Object.keys(schema);
  const constraintKeys = ["format", "required", "pattern"];

  for (const key of keys) {
    if (key === "anyOf" || key === "oneOf" || key === "allOf") {
      if (
        !onlyConstraints(
          (schema as any)[key],
          (ctx as ProblemContext<JSONSchema7>).child[key](),
        )
      ) {
        return false;
      }
    } else if (!constraintKeys.includes(key)) {
      return false;
    }
  }

  return true;
}

function convertType(
  schema: JSONSchema7 & DocumentationProps,
  ctx: ProblemContext<JSONSchema7>,
): TypeDefinition | undefined {
  if (schema.$ref) {
    const prefix = "#/definitions/";
    if (!schema.$ref.startsWith(prefix)) {
      ctx.child.$ref().error(`expected ref to point to definitions`);
      return undefined;
    }
    return {
      type: "ref",
      description: schema.description,
      typeName: schema.$ref.slice(prefix.length),
    };
  }
  let type: typeof schema.type;
  if (!schema.type) {
    if (schema.properties || schema.patternProperties) {
      ctx.child.type().warn(`missing type, assumed "object"`);
      type = "object";
    }
  } else {
    type = schema.type;
  }
  if (Array.isArray(schema.type)) {
    return convertArrayToUnionType(
      schema.type.map((type) => ({ ...schema, type })),
      ctx as any,
    );
  }
  const union = schema.oneOf || schema.anyOf;
  if (union && !union.every((x) => onlyConstraints(x, ctx))) {
    return convertUnionType(schema, ctx);
  }
  if (type === "array") {
    return convertArrayType(schema, ctx);
  }
  if (type === "boolean") {
    return {
      type: "boolean",
      description: schema.description,
      documentationUrl: schema.documentationUrl,
    };
  }
  if (type === "null") {
    return {
      type: "null",
      description: schema.description,
      documentationUrl: schema.documentationUrl,
    };
  }
  if (type === "number" || type === "integer") {
    if (schema.enum !== undefined && schema.const !== undefined) {
      ctx.error(`schema contains "enum" and "const"`);
    }
    return {
      type: "number",
      description: schema.description,
      documentationUrl: schema.documentationUrl,
      isInteger: type === "integer",
      allowedValues:
        schema.const !== undefined
          ? [schema.const as number]
          : (schema.enum as number[]),
      maximum: schema.maximum,
      minimum: schema.minimum,
    };
  }
  if (type === "object") {
    if (schema.properties) {
      return convertObjectType(schema, ctx);
    } else {
      return convertRecordType(schema, ctx);
    }
  }
  if (type === "string") {
    if (schema.enum !== undefined && schema.const !== undefined) {
      ctx.error(`schema contains "enum" and "const"`);
    }
    return {
      type: "string",
      description: schema.description,
      documentationUrl: schema.documentationUrl,
      allowedValues:
        schema.const !== undefined
          ? [schema.const as string]
          : (schema.enum as string[]),
      maxLength: schema.maxLength,
      minLength: schema.minLength,
      pattern: schema.pattern,
    };
  }
  if ((type as unknown as string) === "undefined") {
    return {
      type: "undefined",
      description: schema.description,
      documentationUrl: schema.documentationUrl,
    };
  }
  if (!type) {
    ctx.child.type().error(`missing type`);
  } else {
    ctx.child.type().error(`unexpected type "${type}"`);
  }
}

export async function generate(): Promise<Problem[]> {
  const problems: Problem[] = [];
  const schemas = getResourceTypeSchemas();
  await mkdir(GeneratedOutputDir, { recursive: true });
  const removed = new Set(await readdir(GeneratedOutputDir));

  for await (const schema of schemas) {
    const fileName =
      schema.typeName.replace(/::/g, "-").toLowerCase() + ".json";

    removed.delete(fileName);
    const ctx = new ProblemContext<ResourceTypeSchema>(fileName, "", problems);

    const attributeNames: string[] = [];
    if (schema.readOnlyProperties) {
      for (let i = 0; i < schema.readOnlyProperties.length; ++i) {
        const ptr = schema.readOnlyProperties[i];

        try {
          // this throws if the pointer is invalid
          JsonPointerRaw.get(schema, ptr);
          attributeNames.push(ptr.slice("/properties/".length));
        } catch {
          ctx.child.readOnlyProperties[i]().warn(`invalid pointer %o`, ptr);
        }
      }
    }

    const propertyNames = Object.keys(schema.properties).filter(
      (x) => !attributeNames.includes(x),
    );

    const namespace: ResourceNamespace = {
      definitions: {},
      resource: convertObjectType(
        schema,
        ctx.override<JSONSchema7>(),
        propertyNames,
      ),
    };

    if (attributeNames.length) {
      namespace.attributes = convertObjectType(
        schema,
        ctx.override<JSONSchema7>(),
        attributeNames,
      );
    }

    if (schema.definitions) {
      for (const [definitionName, definition] of Object.entries(
        schema.definitions,
      )) {
        const type = convertType(
          definition,
          ctx.child.definitions[definitionName](),
        );
        if (type) {
          namespace.definitions[definitionName] = type;
        }
      }
    }

    const filepath = resolve(GeneratedOutputDir, fileName);
    const output = JSON.stringify(addIntegrity(namespace), null, 2);
    await writeFile(filepath, await format(output, { filepath }));
  }

  for (const fileName of removed) {
    await unlink(join(GeneratedOutputDir, fileName));
  }

  return problems;
}
