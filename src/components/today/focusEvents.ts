/** Lets any button on the Today page start a focus session without prop drilling. */
export type FocusRequest = { title: string; minutes: number; taskId?: string | null; note?: string };

export const FOCUS_EVENT = "steady:focus";

export function startFocus(req: FocusRequest) {
  window.dispatchEvent(new CustomEvent<FocusRequest>(FOCUS_EVENT, { detail: req }));
}
