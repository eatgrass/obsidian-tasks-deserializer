import {
  TaskDeserializer,
  TaskDetails,
  DEFAULT_TASK_SYMBOLS,
  Priority,
  ExtFieldMatcher,
  TaskSerializerSymbols,
  TaskComponents,
} from ".";
import TaskRegularExpressions from "./TaskRegularExpressions";

export default class DefaultTaskDeserializer implements TaskDeserializer {
  private extFiledMatchers: ExtFieldMatcher[] = [];
  public readonly symbols: TaskSerializerSymbols;

  constructor(
    symbols: TaskSerializerSymbols = DEFAULT_TASK_SYMBOLS,
    matchers: ExtFieldMatcher[] = [],
  ) {
    this.extFiledMatchers = matchers;
    this.symbols = symbols;
  }

  deserialize(raw: string): TaskDetails | null {
    let component = extractTaskComponents(raw);
    if (!component) {
      return null;
    }

    let line = component.body;

    const { TaskFormatRegularExpressions } = this.symbols;

    // Keep matching and removing special strings from the end of the
    // description in any order. The loop should only run once if the
    // strings are in the expected order after the description.
    // NEW_TASK_FIELD_EDIT_REQUIRED
    let matched: boolean;
    let priority: Priority = Priority.None;
    let startDate: string | null = null;
    let scheduledDate: string | null = null;
    let dueDate: string | null = null;
    let doneDate: string | null = null;
    let cancelledDate: string | null = null;
    let createdDate: string | null = null;
    let recurrenceRule: string = "";
    let id: string = "";
    let blockedBy: string[] | [] = [];
    let extensions: Record<string, string | null> = {};
    // Tags that are removed from the end while parsing, but we want to add them back for being part of the description.
    // In the original task description they are possibly mixed with other components
    // (e.g. #tag1 <due date> #tag2), they do not have to all trail all task components,
    // but eventually we want to paste them back to the task description at the end
    let trailingTags = "";
    // Add a "max runs" failsafe to never end in an endless loop:
    const maxRuns = 20;
    let runs = 0;
    do {
      // NEW_TASK_FIELD_EDIT_REQUIRED
      matched = false;
      const priorityMatch = line.match(
        TaskFormatRegularExpressions.priorityRegex,
      );
      if (priorityMatch !== null) {
        priority = this.parsePriority(priorityMatch[1]);
        line = line
          .replace(TaskFormatRegularExpressions.priorityRegex, "")
          .trim();
        matched = true;
      }

      const doneDateMatch = line.match(
        TaskFormatRegularExpressions.doneDateRegex,
      );
      if (doneDateMatch !== null) {
        (doneDate = doneDateMatch[1]), TaskRegularExpressions.dateFormat;
        line = line
          .replace(TaskFormatRegularExpressions.doneDateRegex, "")
          .trim();
        matched = true;
      }

      const cancelledDateMatch = line.match(
        TaskFormatRegularExpressions.cancelledDateRegex,
      );
      if (cancelledDateMatch !== null) {
        cancelledDate = cancelledDateMatch[1];
        line = line
          .replace(TaskFormatRegularExpressions.cancelledDateRegex, "")
          .trim();
        matched = true;
      }

      const dueDateMatch = line.match(
        TaskFormatRegularExpressions.dueDateRegex,
      );
      if (dueDateMatch !== null) {
        (dueDate = dueDateMatch[1]), TaskRegularExpressions.dateFormat;
        line = line
          .replace(TaskFormatRegularExpressions.dueDateRegex, "")
          .trim();
        matched = true;
      }

      const scheduledDateMatch = line.match(
        TaskFormatRegularExpressions.scheduledDateRegex,
      );
      if (scheduledDateMatch !== null) {
        scheduledDate = scheduledDateMatch[1];
        line = line
          .replace(TaskFormatRegularExpressions.scheduledDateRegex, "")
          .trim();
        matched = true;
      }

      const startDateMatch = line.match(
        TaskFormatRegularExpressions.startDateRegex,
      );
      if (startDateMatch !== null) {
        startDate = startDateMatch[1];
        line = line
          .replace(TaskFormatRegularExpressions.startDateRegex, "")
          .trim();
        matched = true;
      }

      const createdDateMatch = line.match(
        TaskFormatRegularExpressions.createdDateRegex,
      );
      if (createdDateMatch !== null) {
        createdDate = createdDateMatch[1];
        line = line
          .replace(TaskFormatRegularExpressions.createdDateRegex, "")
          .trim();
        matched = true;
      }

      const recurrenceMatch = line.match(
        TaskFormatRegularExpressions.recurrenceRegex,
      );
      if (recurrenceMatch !== null) {
        // Save the recurrence rule, but *do not parse it yet*.
        // Creating the Recurrence object requires a reference date (e.g. a due date),
        // and it might appear in the next (earlier in the line) tokens to parse
        recurrenceRule = recurrenceMatch[1].trim();
        line = line
          .replace(TaskFormatRegularExpressions.recurrenceRegex, "")
          .trim();
        matched = true;
      }

      // Match tags from the end to allow users to mix the various task components with
      // tags. These tags will be added back to the description below
      const tagsMatch = line.match(TaskRegularExpressions.hashTagsFromEnd);
      if (tagsMatch != null) {
        line = line.replace(TaskRegularExpressions.hashTagsFromEnd, "").trim();
        matched = true;
        const tagName = tagsMatch[0].trim();
        // Adding to the left because the matching is done right-to-left
        trailingTags =
          trailingTags.length > 0 ? [tagName, trailingTags].join(" ") : tagName;
      }

      const idMatch = line.match(TaskFormatRegularExpressions.idRegex);

      if (idMatch != null) {
        line = line.replace(TaskFormatRegularExpressions.idRegex, "").trim();
        id = idMatch[1].trim();
        matched = true;
      }

      const blockedByMatch = line.match(
        TaskFormatRegularExpressions.blockedByRegex,
      );

      if (blockedByMatch != null) {
        line = line
          .replace(TaskFormatRegularExpressions.blockedByRegex, "")
          .trim();
        blockedBy = blockedByMatch[1]
          .replace(" ", "")
          .split(",")
          .filter((item) => item !== "");
        matched = true;
      }

      for (let matcher of this.extFiledMatchers) {
        const ext = line.match(matcher.regex);
        if (ext) {
          line = line.replace(matcher.regex, "").trim();
          let value = matcher.getValue(ext);
          extensions[matcher.key] = value;
          matched = true;
        }
      }

      runs++;
    } while (matched && runs <= maxRuns);

    // Add back any trailing tags to the description. We removed them so we can parse the rest of the
    // components but now we want them back.
    // The goal is for a task of them form 'Do something #tag1 (due) tomorrow #tag2 (start) today'
    // to actually have the description 'Do something #tag1 #tag2'
    if (trailingTags.length > 0) line += " " + trailingTags;

    // NEW_TASK_FIELD_EDIT_REQUIRED
    return {
      description: line,
      priority,
      startDate,
      createdDate,
      scheduledDate,
      dueDate,
      doneDate,
      cancelledDate,
      recurrenceRule,
      id,
      blockedBy,
      tags: this.extractHashtags(line),
      extensions,
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
