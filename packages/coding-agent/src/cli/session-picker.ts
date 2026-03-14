/**
 * TUI session selector for --resume flag
 */
import * as fs from "node:fs/promises";
import { ProcessTerminal, TUI } from "@oh-my-pi/pi-tui";
import { SessionSelectorComponent } from "../modes/components/session-selector";
import type { SessionInfo } from "../session/session-manager";

/** Show TUI session selector and return selected session path or null if cancelled */
export async function selectSession(fetchSessions: () => Promise<SessionInfo[]>): Promise<string | null> {
	while (true) {
		const sessions = await fetchSessions();
		if (sessions.length === 0) return null;
		const { promise, resolve } = Promise.withResolvers<string | null | "deleted">();
		const ui = new TUI(new ProcessTerminal());
		let resolved = false;
		const selector = new SessionSelectorComponent(
			sessions,
			(path: string) => {
				if (!resolved) {
					resolved = true;
					ui.stop();
					resolve(path);
				}
			},
			() => {
				if (!resolved) {
					resolved = true;
					ui.stop();
					resolve(null);
				}
			},
			() => {
				if (!resolved) {
					resolved = true;
					ui.stop();
					process.exit(0);
				}
			},
			async session => {
				if (!resolved) {
					resolved = true;
					ui.stop();
					await fs.unlink(session.path);
					await fs.rm(session.path.replace(/\.jsonl$/, ""), { recursive: true, force: true });
					resolve("deleted");
				}
			},
		);

		ui.addChild(selector);
		ui.setFocus(selector.getSessionList());
		ui.start();

		const result = await promise;
		if (result !== "deleted") return result;
		// deleted: loop to re-fetch and re-show
	}
}
