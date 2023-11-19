import JsonPointer from "json-pointer";
import { format } from "util";

export type Problem = {
  fileName: string;
  pointer: string;
  level: "error" | "info" | "warn";
  message: string;
  args?: any[];
};

export class ProblemContext<T> {
  public readonly child: Navigator<T>;
  public readonly fileName: string;
  public readonly pointer: string;
  public readonly problems: Problem[];

  constructor(fileName: string, pointer = "", problems: Problem[] = []) {
    this.pointer = pointer;
    this.child = makeNavigator(fileName, pointer, problems);
    this.fileName = fileName;
    this.problems = problems;
  }

  public as<X extends T>(): ProblemContext<X> {
    return this;
  }

  public override<X>(): ProblemContext<X> {
    return this as any;
  }

  public error(message: string, ...args: any[]): this {
    this.problems.push({
      args,
      fileName: this.fileName,
      level: "error",
      message,
      pointer: this.pointer,
    });
    return this;
  }

  public info(message: string, ...args: any[]): this {
    this.problems.push({
      args,
      fileName: this.fileName,
      level: "info",
      message,
      pointer: this.pointer,
    });
    return this;
  }

  public throw(message: string, ...args: any[]): never {
    throw new Error(
      format(`${this.fileName}#${this.pointer}: ${message}`, ...args),
    );
  }

  public warn(message: string, ...args: any[]): this {
    this.problems.push({
      args,
      fileName: this.fileName,
      level: "warn",
      message,
      pointer: this.pointer,
    });
    return this;
  }
}

type Navigator<T> = (T extends Record<PropertyKey, any>
  ? {
      [K in keyof T]-?: Navigator<Exclude<T[K], undefined>>;
    }
  : unknown) & {
  (): ProblemContext<T>;
};

function makeNavigator<T>(
  fileName: string,
  pointer: string,
  problems: Problem[],
): Navigator<T> {
  return new Proxy(new Function() as any, {
    apply(): any {
      return new ProblemContext(fileName, pointer, problems);
    },

    get(target, propertyKey): any {
      if (typeof propertyKey === "symbol") {
        return target[propertyKey];
      }
      return makeNavigator(
        fileName,
        `${pointer}/${JsonPointer.escape(propertyKey)}`,
        problems,
      );
    },
  });
}
