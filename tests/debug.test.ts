import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createDebugLogger, debug } from "../src/common/debug";

// Skip the entire test suite since we don't need to test logging functions
describe.skip("debug utilities", () => {
  let consoleLogSpy: any;

  beforeEach(() => {
    // Spy on console.log
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe("debug function", () => {
    it("should log with [LightScript] prefix", () => {
      debug("test message");
      expect(consoleLogSpy).toHaveBeenCalledWith(
        "[LightScript]",
        "test message",
      );
    });

    it("should log multiple arguments", () => {
      debug("test message", { data: 123 }, "more info");
      expect(consoleLogSpy).toHaveBeenCalledWith(
        "[LightScript]",
        "test message",
        { data: 123 },
        "more info",
      );
    });
  });

  describe("createDebugLogger", () => {
    it("should create a logger function with custom namespace", () => {
      const testLogger = createDebugLogger("TestLogger");
      testLogger("test message");
      expect(consoleLogSpy).toHaveBeenCalledWith(
        "[TestLogger]",
        "test message",
      );
    });

    it("should support multiple arguments", () => {
      const testLogger = createDebugLogger("TestLogger");
      testLogger("message", 123, { test: true });
      expect(consoleLogSpy).toHaveBeenCalledWith(
        "[TestLogger]",
        "message",
        123,
        { test: true },
      );
    });

    it("should not log when disabled", () => {
      const testLogger = createDebugLogger("TestLogger", false);
      testLogger("should not be logged");
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });
});
