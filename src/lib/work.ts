export const WORK_STATUSES = ["TODO", "DOING", "DONE"] as const;
export type WorkStatusKey = (typeof WORK_STATUSES)[number];

export const STATUS_LABEL: Record<WorkStatusKey, string> = { TODO: "To do", DOING: "In progress", DONE: "Done" };

/** Story-point style sizes for a task. */
export const POINT_OPTIONS = [1, 2, 3, 5, 8] as const;
