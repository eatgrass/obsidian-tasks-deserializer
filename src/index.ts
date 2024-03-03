export type TaskDetails = {
  description: string;
  priority: Priority;
  startDate: string | null;
  createdDate: string | null;
  scheduledDate: string | null;
  dueDate: string | null;
  doneDate: string | null;
  cancelledDate: string | null;
  recurrenceRule: string;
  blockedBy: string[];
  id: string;
  tags: string[];
  blockLink: string;
  indentation: string;
  listMarker: string;
  status: string;
};

export interface TaskComponents {
  indentation: string;
  listMarker: string;
  status: string;
  body: string;
  blockLink: string;
}

export enum Priority {
  Highest = "0",
  High = "1",
  Medium = "2",
  None = "3",
  Low = "4",
  Lowest = "5",
}

export interface FieldParser {
  get regex(): RegExp;
  get key(): string;
  getValue(matched: RegExpMatchArray): string;
}

export interface TaskDeserializer {
  deserialize(line: string): TaskDetails | null;
}

export interface TaskSerializer {
  serialize(task: TaskDetails): string;
}

export interface TaskSerializerSymbols {
  // NEW_TASK_FIELD_EDIT_REQUIRED
  readonly prioritySymbols: {
    Highest: string;
    High: string;
    Medium: string;
    Low: string;
    Lowest: string;
    None: string;
  };
  readonly startDateSymbol: string;
  readonly createdDateSymbol: string;
  readonly scheduledDateSymbol: string;
  readonly dueDateSymbol: string;
  readonly doneDateSymbol: string;
  readonly cancelledDateSymbol: string;
  readonly recurrenceSymbol: string;
  readonly idSymbol: string;
  readonly blockedBySymbol: string;
  readonly TaskFormatRegularExpressions: {
    priorityRegex: RegExp;
    startDateRegex: RegExp;
    createdDateRegex: RegExp;
    scheduledDateRegex: RegExp;
    dueDateRegex: RegExp;
    doneDateRegex: RegExp;
    cancelledDateRegex: RegExp;
    recurrenceRegex: RegExp;
    idRegex: RegExp;
    blockedByRegex: RegExp;
  };
}

export function toInlineFieldRegex(innerFieldRegex: RegExp): RegExp {
  /**
   * First, I'm sorry this looks so bad. Javascript's regex engine lacks some
   * conveniences from other engines like PCRE (duplicate named groups)
   * that would've made this easier to express in a readable way.
   *
   * The idea here is that we're trying to say, in English:
   *
   *     "{@link innerFieldRegex} can either be surrounded by square brackets `[]`
   *     or parens `()`"
   *
   * But there is added complexity because we want to disallow mismatched pairs
   *   (i.e. no `[key::value) or (key::value]`). And we have to take care to not
   * introduce new capture groups, since innerFieldRegex may contain capture groups
   * and depend on the numbering.
   *
   * We achieve this by using a variable length, positive lookahead to assert
   * "Only match a the first element of the pair if the other element is somewhere further in the string".
   *
   * This is likely somewhat fragile.
   *
   */
  const fieldRegex = (
    [
      "(?:",
      /*     */ /(?=[^\]]+\])\[/, // Try to match '[' if there's a ']' later in the string
      /*    */ "|",
      /*     */ /(?=[^)]+\))\(/, // Otherwise, match '(' if there's a ')' later in the string
      ")",
      / */,
      innerFieldRegex,
      / */,
      /[)\]]/,
      /(?: *,)?/, // Allow trailing comma, enables workaround from #1913 for rendering issue
      /$/, // Regexes are matched from the end of the string forwards
    ] as const
  )
    .map((val) => (val instanceof RegExp ? val.source : val))
    .join("");
  return new RegExp(fieldRegex, innerFieldRegex.flags);
}

export const DEFAULT_TASK_SYMBOLS: TaskSerializerSymbols = {
  // NEW_TASK_FIELD_EDIT_REQUIRED
  prioritySymbols: {
    Highest: "🔺",
    High: "⏫",
    Medium: "🔼",
    Low: "🔽",
    Lowest: "⏬",
    None: "",
  },
  startDateSymbol: "🛫",
  createdDateSymbol: "➕",
  scheduledDateSymbol: "⏳",
  dueDateSymbol: "📅",
  doneDateSymbol: "✅",
  cancelledDateSymbol: "❌",
  recurrenceSymbol: "🔁",
  blockedBySymbol: "⛔️",
  idSymbol: "🆔",
  TaskFormatRegularExpressions: {
    // The following regex's end with `$` because they will be matched and
    // removed from the end until none are left.
    priorityRegex: /([🔺⏫🔼🔽⏬])$/u,
    startDateRegex: /🛫 *(\d{4}-\d{2}-\d{2})$/u,
    createdDateRegex: /➕ *(\d{4}-\d{2}-\d{2})$/u,
    scheduledDateRegex: /[⏳⌛] *(\d{4}-\d{2}-\d{2})$/u,
    dueDateRegex: /[📅📆🗓] *(\d{4}-\d{2}-\d{2})$/u,
    doneDateRegex: /✅ *(\d{4}-\d{2}-\d{2})$/u,
    cancelledDateRegex: /❌ *(\d{4}-\d{2}-\d{2})$/u,
    recurrenceRegex: /🔁 ?([a-zA-Z0-9, !]+)$/iu,
    blockedByRegex: /⛔️ *([a-z0-9]+( *, *[a-z0-9]+ *)*)$/iu,
    idRegex: /🆔 *([a-z0-9]+)$/iu,
  },
};

export const DATAVIEW_TASK_SYMBOLS: TaskSerializerSymbols = {
  // NEW_TASK_FIELD_EDIT_REQUIRED
  prioritySymbols: {
    Highest: "priority:: highest",
    High: "priority:: high",
    Medium: "priority:: medium",
    Low: "priority:: low",
    Lowest: "priority:: lowest",
    None: "",
  },
  startDateSymbol: "start::",
  createdDateSymbol: "created::",
  scheduledDateSymbol: "scheduled::",
  dueDateSymbol: "due::",
  doneDateSymbol: "completion::",
  cancelledDateSymbol: "cancelled::",
  recurrenceSymbol: "repeat::",
  idSymbol: "id::",
  blockedBySymbol: "blockedBy::",
  TaskFormatRegularExpressions: {
    priorityRegex: toInlineFieldRegex(
      /priority:: *(highest|high|medium|low|lowest)/,
    ),
    startDateRegex: toInlineFieldRegex(/start:: *(\d{4}-\d{2}-\d{2})/),
    createdDateRegex: toInlineFieldRegex(/created:: *(\d{4}-\d{2}-\d{2})/),
    scheduledDateRegex: toInlineFieldRegex(/scheduled:: *(\d{4}-\d{2}-\d{2})/),
    dueDateRegex: toInlineFieldRegex(/due:: *(\d{4}-\d{2}-\d{2})/),
    doneDateRegex: toInlineFieldRegex(/completion:: *(\d{4}-\d{2}-\d{2})/),
    cancelledDateRegex: toInlineFieldRegex(/cancelled:: *(\d{4}-\d{2}-\d{2})/),
    recurrenceRegex: toInlineFieldRegex(/repeat:: *([a-zA-Z0-9, !]+)/),
    blockedByRegex: toInlineFieldRegex(
      /blockedBy:: *([a-z0-9]+( *, *[a-z0-9]+ *)*)$/,
    ),
    idRegex: toInlineFieldRegex(/id:: *([a-z0-9]+)/),
  },
};

export { default } from "./DefaultTaskDeserializer";
