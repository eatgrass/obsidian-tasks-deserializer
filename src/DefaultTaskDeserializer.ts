import {
  TaskDeserializer,
  TaskDetails,
  DEFAULT_TASK_SYMBOLS,
  Priority,
  FieldParser,
  TaskSerializerSymbols,
  TaskComponents,
} from ".";
import TaskRegularExpressions from "./TaskRegularExpressions";



const EmojiRegularExpressions: Record<string, RegExp> = {
  priority: /([🔺⏫🔼🔽⏬])/gu,
  startDate: /🛫 *(\d{4}-\d{2}-\d{2})/gu,
  createdDate: /➕ *(\d{4}-\d{2}-\d{2})/gu,
  scheduledDate: /[⏳⌛] *(\d{4}-\d{2}-\d{2})/gu,
  dueDate: /[📅📆🗓] *(\d{4}-\d{2}-\d{2})/gu,
  doneDate: /✅ *(\d{4}-\d{2}-\d{2})/gu,
  cancelledDate: /❌ *(\d{4}-\d{2}-\d{2})/gu,
  recurrence: /🔁 ?([a-zA-Z0-9, !]+)/giu,
  blockedBy: /⛔️ *([a-z0-9]+( *, *[a-z0-9]+ *)*)/giu,
  id: /🆔 *([a-z0-9]+)/giu,
};

interface Parser<T> {
  get regex(): RegExp;

  get key(): string;

  parse(matches: IterableIterator<RegExpMatchArray>): T;
}

const TagParser: Parser<Set<string>> = {
  get regex(): RegExp {
    return /#([^\u2000-\u206F\u2E00-\u2E7F'!"#$%&()*+,.:;<=>?@^`{|}~\[\]\\\s]+)/giu;
  },
  get key(): string {
    return "tags";
  },
  parse(matches: IterableIterator<RegExpMatchArray>): Set<string> {
    const tags = new Set<string>();
    for (const match of matches) {
      if (match) {
        tags.add(match[1]);
      }
    }
    return tags;
  },
};

const EMOJI_FILED_PARSERS: Parser<string | null>[] = Object.entries(
  EmojiRegularExpressions,
).map(([key, value]) => {
  return {
    get regex(): RegExp {
      return value;
    },
    get key(): string {
      return key;
    },
    parse(matches: IterableIterator<RegExpMatchArray>): string | null {
      for (const match of matches) {
        if (!match[1]) {
          continue;
        } else {
          return match[1].trim();
        }
      }
      return null;
    },
  };
});

export function parseTaskBody(body: string): Record<string, any> {
  const parsers = [...EMOJI_FILED_PARSERS, TagParser];
  const fields: Record<string, any> = {};

  for (const parser of parsers) {
    const matches = body.matchAll(parser.regex);
    fields[parser.key] = parser.parse(matches);
    body = body.replace(parser.regex, "");
  }
  fields["description"] = body.trim();
  return fields;
}

export default class DefaultTaskDeserializer implements TaskDeserializer {
  public readonly symbols: TaskSerializerSymbols;

  deserialize(raw: string): TaskDetails | null {
    let component = extractTaskComponents(raw);
    if (!component) {
      return null;
    }
    let body = component.body;
    const fields = parseTaskBody(body)


    // NEW_TASK_FIELD_EDIT_REQUIRED
    return {
      description:fields["description"] ?? "",
      priority: this.parsePriority(fields["priority"]),
      startDate: fields['startDate'],
      createdDate: fields['createdDate'],
      scheduledDate: fields['scheduledDate'],
      dueDate: fields['dueDate'],
      doneDate: fields['doneDate'],
      cancelledDate: fields['cancelledDate'],
      recurrenceRule: fields['recurrence'],
      id: fields['id'],
      blockedBy: fields['blockedBy'],
      tags: fields['tags'],
      blockLink: component.blockLink,
      indentation: component.indentation,
      listMarker: component.listMarker,
      status: component.status,
    };
  }

  protected parsePriority(p: string): Priority {
    const { prioritySymbols } = DEFAULT_TASK_SYMBOLS;
    switch (p) {
      case prioritySymbols.Lowest:
        return Priority.Lowest;
      case prioritySymbols.Low:
        return Priority.Low;
      case prioritySymbols.Medium:
        return Priority.Medium;
      case prioritySymbols.High:
        return Priority.High;
      case prioritySymbols.Highest:
        return Priority.Highest;
      default:
        return Priority.None;
    }
  }

  protected extractHashtags(description: string): string[] {
    return (
      description
        .match(TaskRegularExpressions.hashTags)
        ?.map((tag) => tag.trim()) ?? []
    );
  }
}

export function extractTaskComponents(line: string): TaskComponents | null {
  // Check the line to see if it is a markdown task.
  const regexMatch = line.match(TaskRegularExpressions.taskRegex);
  if (regexMatch === null) {
    return null;
  }

  const indentation = regexMatch[1];
  const listMarker = regexMatch[2];

  // Get the status of the task.
  const statusString = regexMatch[3];
  const status = statusString;

  // match[4] includes the whole body of the task after the brackets.
  let body = regexMatch[4].trim();

  // Match for block link and remove if found. Always expected to be
  // at the end of the line.
  const blockLinkMatch = body.match(TaskRegularExpressions.blockLinkRegex);
  const blockLink = blockLinkMatch !== null ? blockLinkMatch[0] : "";

  if (blockLink !== "") {
    body = body.replace(TaskRegularExpressions.blockLinkRegex, "").trim();
  }
  return { indentation, listMarker, status, body, blockLink };
}
