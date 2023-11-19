import { createHash } from "crypto";
import { canonicalize } from "json-canonicalize";

export type IntegrityProps = { $hash: string };

export function addIntegrity<T>(value: T): T & IntegrityProps {
  const hash = createHash("sha1");
  hash.update(canonicalize(value));

  return {
    ...value,
    $hash: hash.digest("hex"),
  };
}
