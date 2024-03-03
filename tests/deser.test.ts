import { describe, expect, test } from "@jest/globals";
import DefaultTaskDeserializer, { Priority } from "../src";

describe("deserialize markdown task line", () => {
  test("parse task", () => {
    const deserializer = new DefaultTaskDeserializer();
    const task = deserializer.deserialize(
      "- [x] Hello Obsidian ➕ 2024-01-25 ⏳ 2024-02-08",
    );
    expect(task!.description).toBe("Hello Obsidian");
    expect(task!.createdDate).toBe("2024-01-25");
    expect(task!.scheduledDate).toBe("2024-02-08");
  });

  test("parse mixed format", () => {
    const deserializer = new DefaultTaskDeserializer();
    const task = deserializer.deserialize(
      "- [x] Hello ➕ 2024-01-25Obsid🔺ian  ⏳ 2024-02-08",
    );
    expect(task!.description).toBe("Hello Obsidian");
    expect(task!.createdDate).toBe("2024-01-25");
    expect(task!.priority).toBe(Priority.Highest);
    expect(task!.scheduledDate).toBe("2024-02-08");
  });

  test("parsing an invalid task line should return null", () => {
    const deserializer = new DefaultTaskDeserializer();
    const task = deserializer.deserialize("Hello **Obsidian**");
    expect(task).toBeNull();
  });
});
