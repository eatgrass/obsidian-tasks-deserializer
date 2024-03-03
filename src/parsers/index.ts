import * as P from "parsimmon";

export enum Priority {
  Highest = "0",
  High = "1",
  Medium = "2",
  None = "3",
  Low = "4",
  Lowest = "5",
}

interface TaskBody {
  description: string[];
  priority: Priority;
  startDate: string | null;
  createdDate: string | null;
  scheduledDate: string | null;
  dueDate: string | null;
  doneDate: string | null;
  cancelledDate: string | null;
  recurrenceRule: string;
  blockedBy: string;
  id: string;
  tags: string[];
  blockLink: string | null;
}

interface TaskDetail {
  description: string;
  priority: Priority;
  startDate: string | null;
  createdDate: string | null;
  scheduledDate: string | null;
  dueDate: string | null;
  doneDate: string | null;
  cancelledDate: string | null;
  recurrenceRule: string;
  blockedBy: string;
  id: string;
  tags: string[];
  blockLink: string | null;
  indentation: string;
  listMarker: string;
  status: string;
}

export interface ObsidianTaskLanguage {
  indentation: string;

  listMarker: string;

  status: string;

  blockLink: string;

  priority: Priority;

  body: TaskBody;

  task: TaskDetail;

  id: string;

  field: string;

  description: string;
}

export const EXPRESSION = P.createLanguage<ObsidianTaskLanguage>({
  indentation: (_) => P.optWhitespace,

  listMarker: (_) => P.regex(/[-*+]|[0-9]+\./),

  status: (_) =>
    P.seqMap(
      P.whitespace.atLeast(1),
      P.string("["),
      P.any,
      P.string("]"),
      P.whitespace.atLeast(1),
      (_1, _2, status, _3, _4) => {
        return status;
      },
    ),

  description: (q) =>
    P.regex(/.*/)
      .sepBy(q.field)
      .map((result) => {
        console.log(result);
        return result.join(",");
      }),

  field: (q) => P.alt(q.priority, q.id),

  priority: (_) =>
    P.oneOf("🔺⏫🔼🔽⏬").map((emoji) => {
      switch (emoji) {
        case "🔺":
          return Priority.Highest;
        case "⏫":
          return Priority.High;
        case "🔼":
          return Priority.Medium;
        case "🔽":
          return Priority.Low;
        case "⏬":
          return Priority.Lowest;
      }
      return Priority.Medium;
    }),

  id: () =>
    P.seqMap(
      P.string("🆔"),
      P.whitespace.atLeast(1),
      P.regex(/[a-z0-9]+/iu),
      (_1, _2, id) => id,
    ),

  blockLink: (_) =>
    P.seqMap(
      P.string(" ^"),
      P.regex(/[a-z0-9]+/i),
      P.end,
      (_, blockLink) => blockLink,
    ),

  body: (q) =>
    P.seqMap(q.description, P.alt(q.blockLink, P.end), (desc, blockLink) => {
      return {
        description: ["a", "b"],
        priority: Priority.Medium,
        startDate: "21",
        createdDate: "23",
        scheduledDate: "24",
        dueDate: "25",
        doneDate: null,
        cancelledDate: null,
        recurrenceRule: "s",
        blockedBy: "ds",
        id: "12",
        tags: [],
        blockLink: null,
      };
    }),

  task: (q) =>
    P.seqMap(
      q.indentation,
      q.listMarker,
      q.status,
      q.body,
      (indentation, listMarker, status, body) => {
        console.log(body);
        return {
          description: "a",
          priority: Priority.Medium,
          startDate: "2023",
          createdDate: "2024",
          scheduledDate: "2025",
          dueDate: "2026",
          doneDate: "2011",
          cancelledDate: "1992",
          recurrenceRule: "every one month",
          blockedBy: "a21321",
          id: "231dew",
          tags: ["hello", "obsidian", "dso"],
          blockLink: body.blockLink,
          indentation,
          listMarker,
          status,
        };
      },
    ),
});
