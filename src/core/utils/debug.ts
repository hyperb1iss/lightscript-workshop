/**
 * Debug utility for SignalRGB lightscripts
 * Provides consistent logging with stylized console output
 */

type LogLevel = "debug" | "info" | "warn" | "error" | "success";

// Color theme for console styling
const COLORS = {
  primary: "#ff71ce", // neon pink
  secondary: "#01cdfe", // neon blue
  tertiary: "#05ffa1", // neon green
  quaternary: "#b967ff", // neon purple
  warning: "#fffb96", // neon yellow
  error: "#fe0000", // bright red
  success: "#05ffa1", // neon green
  debug: "#9d9d9d", // gray
  background: "#2d2b55", // dark purple
};

// Emoji set for different message types
const EMOJI = {
  debug: "🔍",
  info: "🔌",
  warn: "⚡",
  error: "🔥",
  success: "✨",
  startup: "🌠",
  time: "⏱️",
  effect: "🎨",
  control: "🕹️",
};

/**
 * Prints a stylized startup banner to the console
 */
export function printStartupBanner(): void {
  const styles = {
    banner: `background: linear-gradient(90deg, #000033 0%, #0033cc 25%, #6600cc 50%, #cc00ff 75%, #ff00ff 100%); 
             color: #00ffff; 
             font-weight: bold; 
             padding: 8px 12px; 
             border-radius: 4px; 
             font-size: 16px; 
             text-shadow: 0 0 5px #00ffff, 0 0 10px #00ffff;`,
    credit: `background: linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(5,255,161,0.1) 100%);
             color: ${COLORS.tertiary}; 
             font-size: 14px; 
             padding: 4px 12px;
             border-radius: 0 0 4px 4px;
             border-top: 1px solid rgba(1, 205, 254, 0.3);
             font-style: italic;`,
  };

  console.log(
    "%c ✦ LightScript Workshop ✦ %c by @hyperb1iss",
    styles.banner,
    styles.credit,
  );
}

/**
 * Creates a debug logger function with a specific namespace
 * @param namespace - The namespace to prefix log messages with
 * @param enabled - Whether debug logging is enabled
 * @returns A function that logs messages with the specified namespace
 */
export function createDebugLogger(namespace: string, enabled = true) {
  return function debug(...args: unknown[]) {
    if (!enabled) return;

    const level: LogLevel =
      (args[0] as LogLevel) &&
      ["debug", "info", "warn", "error", "success"].includes(args[0] as string)
        ? (args.shift() as LogLevel)
        : "debug";

    stylizedLog(level, namespace, ...args);
  };
}

/**
 * Stylized console logging
 */
function stylizedLog(
  level: LogLevel,
  namespace: string,
  ...args: unknown[]
): void {
  let color = COLORS.debug;
  let emoji = EMOJI.debug;
  let method: "log" | "warn" | "error" = "log";

  // Select appropriate styling based on log level
  switch (level) {
    case "info":
      color = COLORS.secondary;
      emoji = EMOJI.info;
      break;
    case "warn":
      color = COLORS.warning;
      emoji = EMOJI.warn;
      method = "warn";
      break;
    case "error":
      color = COLORS.error;
      emoji = EMOJI.error;
      method = "error";
      break;
    case "success":
      color = COLORS.success;
      emoji = EMOJI.success;
      break;
  }

  // Create stylized label
  const label = `%c${emoji} [${namespace}]`;
  const style = `color: ${color}; font-weight: bold;`;

  // Log with styling
  console[method](label, style, ...args);
}

/**
 * Default debug logger with no namespace
 */
export function debug(...args: unknown[]) {
  const level: LogLevel =
    (args[0] as LogLevel) &&
    ["debug", "info", "warn", "error", "success"].includes(args[0] as string)
      ? (args.shift() as LogLevel)
      : "debug";

  stylizedLog(level, "LightScript", ...args);
}
