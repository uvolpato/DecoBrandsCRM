// Aggiorna il grafo del codice (graphify, solo AST) quando la sessione si ferma,
// senza aspettare il commit. Stessa cosa dell'hook Stop di .claude/settings.json.
import { spawn } from "child_process";

const aggiorna = (directory) =>
  spawn("graphify", ["update", "."], { cwd: directory, stdio: "ignore", shell: true, detached: true }).unref();

export default {
  // OpenCode 1 (qui 1.18); ponytail: con OpenCode 2 va rifatto con setup()
  async server({ directory }) {
    return {
      event: async ({ event }) => {
        if (event.type === "session.idle") aggiorna(directory);
      },
    };
  },
};
