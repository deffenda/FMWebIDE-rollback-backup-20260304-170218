import type { FMPlugin } from "../../../src/plugins";

export const customScriptStepPlugin: FMPlugin = {
  id: "plugin.example.custom-script-step",
  version: "1.0.0",
  compatibility: "^1.0.0",
  activate(context) {
    context.registerScriptStep({
      stepType: "Plugin::Send Slack Message",
      displayName: "Send Slack Message",
      description: "Demo step that posts (or simulates) a Slack webhook message.",
      errorCodes: {
        VALIDATION_FAILED: 17101,
        EXECUTION_FAILED: 17102
      },
      validate(input) {
        const webhookUrl = String(input.step.params?.webhookUrl ?? "").trim();
        const message = String(input.step.params?.message ?? "").trim();
        if (!message) {
          return {
            ok: false,
            lastError: 17101,
            message: "Plugin::Send Slack Message requires a non-empty message"
          };
        }
        if (!webhookUrl) {
          // Allow missing webhook as dry-run mode.
          return {
            ok: true
          };
        }
        if (!/^https?:\/\//i.test(webhookUrl)) {
          return {
            ok: false,
            lastError: 17101,
            message: "Plugin::Send Slack Message webhookUrl must be http(s)"
          };
        }
        return {
          ok: true
        };
      },
      async execute(input) {
        const webhookUrl = String(input.step.params?.webhookUrl ?? "").trim();
        const message = String(input.step.params?.message ?? "").trim();
        const channel = String(input.step.params?.channel ?? "").trim();

        const payload = {
          text: message,
          channel: channel || undefined
        };

        if (!webhookUrl) {
          input.logger.log("info", "Slack step dry-run (no webhook configured)", {
            payload
          });
          input.setVariable("$$PLUGIN_LAST_SLACK_MESSAGE", message);
          input.setVariable("$$PLUGIN_LAST_SLACK_STATUS", "dry-run");
          return {
            handled: true,
            ok: true,
            lastError: 0,
            lastMessage: "Slack step dry-run complete"
          };
        }

        // This is intentionally best-effort and isolated from runtime failures.
        try {
          const response = await fetch(webhookUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
          });
          if (!response.ok) {
            const text = await response.text();
            return {
              handled: true,
              ok: false,
              lastError: 17102,
              lastMessage: `Slack webhook failed: ${response.status} ${text}`.trim()
            };
          }
        } catch (error) {
          const messageText = error instanceof Error ? error.message : String(error ?? "Unknown fetch error");
          return {
            handled: true,
            ok: false,
            lastError: 17102,
            lastMessage: `Slack webhook request failed: ${messageText}`
          };
        }

        input.setVariable("$$PLUGIN_LAST_SLACK_MESSAGE", message);
        input.setVariable("$$PLUGIN_LAST_SLACK_STATUS", "sent");
        return {
          handled: true,
          ok: true,
          lastError: 0,
          lastMessage: "Slack message sent"
        };
      }
    });
  }
};

export default customScriptStepPlugin;
