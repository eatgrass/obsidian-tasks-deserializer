import { describe, expect, test } from "@jest/globals";
import DefaultTaskDeserilizer, {
  DATAVIEW_TASK_SYMBOLS,
  ExtFieldMatcher,
  toInlineFieldRegex,
} from "../src";

class PomodoroFieldMatcher implements ExtFieldMatcher {
  get regex(): RegExp {
    return toInlineFieldRegex(/🍅:: *(\d* *\/? *\d*)/);
  }

  get key(): string {
    return "pomodoros";
  }

  getValue(matched: RegExpMatchArray): string {
    return matched[1];
  }
}

describe("deserialize markdown task line", () => {
  test("default deserilizer - description", () => {
    const deserializer = new DefaultTaskDeserilizer();
    const task = deserializer.deserialize(
      "- [x] Hello Obsidian ➕ 2024-01-25 ⏳ 2024-02-08",
    );
    expect(task!.description).toBe("Hello Obsidian");
    expect(task!.createdDate).toBe("2024-01-25");
    expect(task!.scheduledDate).toBe("2024-02-08");
  });

  test("should be able to work with dataview format", () => {
    const deserializer = new DefaultTaskDeserilizer(DATAVIEW_TASK_SYMBOLS);
    const task = deserializer.deserialize(
      "- [x] Hello Obsidian [created:: 2024-01-25]  (scheduled:: 2024-02-08)",
    );
    expect(task!.description).toBe("Hello Obsidian");
    expect(task!.createdDate).toBe("2024-01-25");
    expect(task!.scheduledDate).toBe("2024-02-08");
  });

  test("deserialize with custom field", () => {
    const deserializer = new DefaultTaskDeserilizer(DATAVIEW_TASK_SYMBOLS, [
      new PomodoroFieldMatcher(),
    ]);
    const task = deserializer.deserialize(
      "- [x] Hello Obsidian [created:: 2024-01-25]  (scheduled:: 2024-02-08) [🍅:: 8]",
    );
    expect(task!.extensions["pomodoros"]).toBe("8");
  });
});
