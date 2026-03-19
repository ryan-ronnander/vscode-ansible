import * as vscode from "vscode";
import * as yaml from "yaml";

// Ansible task keywords that do not commonly appear in non-Ansible YAML files.
// Used as a fallback heuristic to detect task files that are not inside a
// standard role directory structure. Requires 2+ matches to reduce false
// positives from generic YAML files that happen to share a key name.
const taskSpecificKeys = [
  "block",
  "rescue",
  "always",
  "register",
  "when",
  "changed_when",
  "failed_when",
  "loop",
  "loop_control",
  "notify",
  "delegate_to",
  "run_once",
  "retries",
  "until",
  "become",
  "become_user",
  "check_mode",
  "no_log",
  "ignore_errors",
  "async",
  "poll",
  "throttle",
  "timeout",
  "action",
  "local_action",
];

// Matches files inside an Ansible role directory structure, e.g.:
//   roles/<role>/tasks/*.yml
//   roles/<role>/handlers/main.yaml
//   roles/<role>/defaults/main.yml
const rolePathPattern =
  /\/roles\/[^/]+\/(tasks|handlers|defaults|vars|meta)\//;

export async function applyFileInspectionForKeywords(
  editor: vscode.TextEditor | undefined,
): Promise<void> {
  if (!editor || !editor.document || editor.document.isUntitled) {
    return;
  }

  try {
    const fileType = editor.document.fileName.split(".").pop();

    if (fileType !== "yaml" && fileType !== "yml") {
      return;
    }

    // Files inside a standard Ansible role structure are unambiguously Ansible
    if (rolePathPattern.test(editor.document.fileName)) {
      console.log("[file-inspection] language set by role path detection");
      await vscode.languages.setTextDocumentLanguage(
        editor.document,
        "ansible",
      );
      return;
    }

    const fileText = editor.document.getText();
    const parsedYaml = fileText ? yaml.parse(fileText) : "";

    if (parsedYaml && Array.isArray(parsedYaml)) {
      // Check for playbook-level keys
      const topLevelKeys = Object.keys(parsedYaml[0]);
      const ansibleTopLevelKeys = [
        "hosts",
        "import_playbook",
        "ansible.builtin.import_playbook",
      ];

      let found = ansibleTopLevelKeys.some((key) =>
        topLevelKeys.includes(key),
      );

      // If no playbook keys found, check for task-specific keywords across
      // all items in the sequence. Requires 2+ matching keywords to avoid
      // false positives from generic YAML files.
      if (!found) {
        const allKeys = new Set<string>();
        for (const item of parsedYaml) {
          if (item && typeof item === "object") {
            for (const key of Object.keys(item)) {
              allKeys.add(key);
            }
          }
        }
        const matchCount = taskSpecificKeys.filter((key) =>
          allKeys.has(key),
        ).length;
        found = matchCount >= 2;
      }

      if (found) {
        console.log("[file-inspection] language set by file inspection");
        await vscode.languages.setTextDocumentLanguage(
          editor.document,
          "ansible",
        );
      }
    }
  } catch {
    console.error("Error loading yaml file");
  }
}
