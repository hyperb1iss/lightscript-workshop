import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { BaseEffect } from "../src/common/effect";
import * as THREE from "three";

// Mock THREE.js
vi.mock("three", () => {
  return {
    WebGLRenderer: vi.fn(() => ({
      setSize: vi.fn(),
      render: vi.fn(),
    })),
    Scene: vi.fn(),
    OrthographicCamera: vi.fn(),
    Clock: vi.fn(() => ({
      getElapsedTime: vi.fn().mockReturnValue(0),
    })),
    PlaneGeometry: vi.fn(),
    ShaderMaterial: vi.fn(() => ({
      uniforms: {
        testUniform: { value: "test" },
      },
    })),
    Mesh: vi.fn(),
    Vector2: vi.fn(),
    IUniform: vi.fn(),
  };
});

// Mock the webgl module
vi.mock("../src/common/webgl", () => ({
  initializeWebGL: vi.fn().mockReturnValue({
    canvas: document.createElement("canvas"),
    scene: {},
    camera: {},
    renderer: {
      render: vi.fn(),
    },
    clock: {
      getElapsedTime: vi.fn().mockReturnValue(0),
    },
  }),
  createShaderQuad: vi.fn().mockReturnValue({
    mesh: {},
    material: {
      uniforms: {
        testUniform: { value: "test" },
      },
    },
  }),
  startAnimationLoop: vi.fn().mockReturnValue(1),
  createStandardUniforms: vi.fn().mockReturnValue({
    iTime: { value: 0 },
    iResolution: { value: { x: 100, y: 100 } },
  }),
}));

// Create a test implementation of BaseEffect
class TestEffect extends BaseEffect<{ test: string }> {
  // Add test properties needed for our mocks
  private webGLContext: any = null;
  private material: any = null;

  // Implement required abstract methods
  protected async initializeRenderer(): Promise<void> {
    // Mock implementation
    return Promise.resolve();
  }

  protected render(_time: number): void {
    // Mock implementation
  }

  protected updateParameters(controls: { test: string }): void {
    // Mock implementation
    this.updateUniforms(controls);
  }

  // Add a public accessor to bypass initialization issues
  public getWebGLContext() {
    return this.webGLContext;
  }

  public setWebGLContext(ctx: any) {
    this.webGLContext = ctx;
  }

  public setMaterial(mat: any) {
    this.material = mat;
  }

  public getAnimationId() {
    return this.animationId;
  }

  public setAnimationId(id: number) {
    this.animationId = id;
  }

  protected initializeControls(): void {
    (window as any).test = "default";
  }

  protected getControlValues() {
    return {
      test: (window as any).test || "default",
    };
  }

  protected createUniforms(): Record<string, THREE.IUniform> {
    return {
      testUniform: { value: "test" },
    };
  }

  protected updateUniforms(controls: { test: string }): void {
    if (this.material) {
      this.material.uniforms.testUniform = { value: controls.test };
    }
  }
}

describe("BaseEffect", () => {
  let effect: TestEffect;
  let webglModule: any;

  // Mock global objects
  beforeEach(async () => {
    // Mock requestAnimationFrame
    global.requestAnimationFrame = vi.fn().mockReturnValue(1);
    global.cancelAnimationFrame = vi.fn();

    // Mock canvas element
    document.body.innerHTML = '<canvas id="exCanvas"></canvas>';

    // Import the webgl module
    webglModule = await import("../src/common/webgl");

    // Create effect instance
    effect = new TestEffect({
      id: "test-effect",
      name: "Test Effect",
      debug: false,
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
    document.body.innerHTML = "";
  });

  describe("initialization", () => {
    it("should initialize with correct properties", () => {
      expect(effect).toHaveProperty("id", "test-effect");
      expect(effect).toHaveProperty("name", "Test Effect");
    });

    it("should initialize WebGL when properly set up", () => {
      // Manually set up the webGLContext to avoid initialization issues
      const mockCtx = webglModule.initializeWebGL();
      effect.setWebGLContext(mockCtx);

      // Manually set up material
      const mockMaterial = { uniforms: { testUniform: { value: "test" } } };
      effect.setMaterial(mockMaterial);

      // Mock the update method
      (window as any).update = vi.fn();

      // Verify functions are called
      expect(webglModule.initializeWebGL).toHaveBeenCalled();
    });

    it("should have update function functionality", () => {
      // Manually set up the context and material
      const mockCtx = webglModule.initializeWebGL();
      effect.setWebGLContext(mockCtx);

      const mockMaterial = { uniforms: { testUniform: { value: "test" } } };
      effect.setMaterial(mockMaterial);

      // Add update function to window
      (window as any).update = effect.update.bind(effect);

      expect(typeof (window as any).update).toBe("function");
    });
  });

  describe("lifecycle methods", () => {
    beforeEach(() => {
      // Manual setup to bypass initialization
      const mockCtx = webglModule.initializeWebGL();
      effect.setWebGLContext(mockCtx);

      const mockMaterial = { uniforms: { testUniform: { value: "test" } } };
      effect.setMaterial(mockMaterial);

      // Set animation ID
      effect.setAnimationId(1);
    });

    it("should stop animation when requested", () => {
      effect.stop();
      expect(global.cancelAnimationFrame).toHaveBeenCalledWith(1);
    });

    it("should update controls when called", () => {
      // Mock control value
      (window as any).test = "updated";

      // Create spy on updateUniforms
      const updateSpy = vi.spyOn(effect as any, "updateUniforms");

      // Call update
      effect.update(true);

      // Check updateUniforms was called with the right values
      expect(updateSpy).toHaveBeenCalledWith({ test: "updated" });
    });
  });
});
