import { describe, expect, it } from "vitest";
import { fileNameOf } from "./download";

describe("fileNameOf", () => {
  it("reads the file name the export sends", () => {
    expect(fileNameOf('attachment; filename="movements-20261030-073712.csv"', "movements.csv")).toBe(
      "movements-20261030-073712.csv",
    );
  });

  it("reads an unquoted name, and an RFC 5987 one", () => {
    expect(fileNameOf("attachment; filename=movements.csv", "x.csv")).toBe("movements.csv");
    expect(fileNameOf("attachment; filename*=UTF-8''movimientos%20octubre.csv", "x.csv")).toBe("movimientos octubre.csv");
  });

  it("falls back when there is no header", () => {
    expect(fileNameOf(null, "movements.csv")).toBe("movements.csv");
    expect(fileNameOf(undefined, "movements.csv")).toBe("movements.csv");
    expect(fileNameOf("inline", "movements.csv")).toBe("movements.csv");
  });
});
