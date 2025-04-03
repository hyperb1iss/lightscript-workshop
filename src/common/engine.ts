/**
 * DevEngine - Development engine for SignalRGB effects
 * Manages effect loading, control state, and UI generation
 */

import { createDebugLogger } from "./debug";
import { ControlDefinition, ControlValues } from "./definitions";
import { parseControlsFromTemplate } from "./parser";
import { generateControlUI } from "./registry";
import { effects } from "../index";

const debug = createDebugLogger("DevEngine");

/**
 * DevEngine class for managing effects
 */
export class DevEngine {
  // Current effect data
  private currentEffect: (typeof effects)[0] | null = null;
  private controlDefinitions: ControlDefinition[] = [];
  private controlValues: ControlValues = {};

  // DOM elements
  private container: HTMLElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private controlsContainer: HTMLElement | null = null;
  private statsPanel: HTMLElement | null = null;
  private fpsCounter: HTMLElement | null = null;
  private fpsValue = 0;
  private frameCount = 0;
  private lastTime = 0;
  private controlsCollapsed = false;

  // Add more properties for our UI elements
  private statsContainer: HTMLDivElement | null = null;
  private effectSelector: HTMLSelectElement | null = null;
  private metadataContainer: HTMLDivElement | null = null;
  private layoutContainer: HTMLDivElement | null = null;
  private leftPanel: HTMLDivElement | null = null;
  private rightPanel: HTMLDivElement | null = null;

  /**
   * Create a new DevEngine instance
   */
  constructor() {
    debug("DevEngine initialized");
  }

  /**
   * Initialize the development environment
   */
  public async initialize(container: HTMLElement): Promise<void> {
    this.container = container;

    // Create canvas reference
    this.canvas = document.getElementById("exCanvas") as HTMLCanvasElement;
    if (!this.canvas) {
      throw new Error('Canvas element with ID "exCanvas" not found');
    }

    // Create layout container for our 3-panel design
    this.layoutContainer = document.createElement("div");
    this.layoutContainer.style.position = "fixed";
    this.layoutContainer.style.top = "0";
    this.layoutContainer.style.left = "0";
    this.layoutContainer.style.width = "100%";
    this.layoutContainer.style.height = "100vh";
    this.layoutContainer.style.display = "flex";
    this.layoutContainer.style.justifyContent = "space-between";
    this.layoutContainer.style.pointerEvents = "none";
    this.layoutContainer.style.zIndex = "50";
    document.body.appendChild(this.layoutContainer);

    // Create left panel for effect selector and stats
    this.leftPanel = document.createElement("div");
    this.leftPanel.style.padding = "10px";
    this.leftPanel.style.pointerEvents = "auto";
    this.layoutContainer.appendChild(this.leftPanel);

    // Create right panel for controls
    this.rightPanel = document.createElement("div");
    this.rightPanel.style.padding = "10px";
    this.rightPanel.style.pointerEvents = "auto";
    this.layoutContainer.appendChild(this.rightPanel);

    // Create our UI components
    this.createEffectSelectorAndStats(this.leftPanel);
    this.createControlsPanel(this.rightPanel);

    // Add key listener for toggling controls panel
    document.addEventListener("keydown", (event) => {
      if (event.ctrlKey && event.code === "KeyC") {
        this.toggleControls();
      }
    });

    // Get the effect ID from URL or use the first effect
    const urlParams = new URLSearchParams(window.location.search);
    const effectId = urlParams.get("effect") || effects[0].id;

    // Load the effect after UI is created
    await this.loadEffect(effectId);

    // Add window resize listener to handle responsive layout
    window.addEventListener("resize", this.handleResize.bind(this));

    this.handleResize();

    // Start FPS monitor
    this.startFPSMonitor();
  }

  /**
   * Create the effect selector and stats panel on the left side
   */
  private async createEffectSelectorAndStats(
    container: HTMLElement,
  ): Promise<void> {
    // Create the stats container - make it match the controls panel height
    this.statsContainer = document.createElement("div");
    this.statsContainer.style.width = "220px";
    this.statsContainer.style.background = "rgba(12, 12, 22, 0.85)";
    this.statsContainer.style.borderRadius = "4px";
    this.statsContainer.style.padding = "10px";
    this.statsContainer.style.color = "#fff";
    this.statsContainer.style.fontFamily = "'Rajdhani', sans-serif";
    this.statsContainer.style.fontSize = "14px";
    this.statsContainer.style.marginBottom = "10px";
    this.statsContainer.style.boxShadow =
      "0 0 15px rgba(1, 205, 254, 0.2), 0 0 5px rgba(255, 113, 206, 0.2)";
    this.statsContainer.style.border = "1px solid rgba(255, 113, 206, 0.2)";
    this.statsContainer.style.backdropFilter = "blur(5px)";
    this.statsContainer.style.zIndex = "50";
    this.statsContainer.style.transition = "all 0.3s ease";
    this.statsContainer.style.height = "calc(100vh - 20px)"; // Match controls panel height

    // Add glowing top border
    const topBorder = document.createElement("div");
    topBorder.style.position = "absolute";
    topBorder.style.top = "0";
    topBorder.style.left = "0";
    topBorder.style.right = "0";
    topBorder.style.height = "2px";
    topBorder.style.background =
      "linear-gradient(90deg, #ff71ce, #01cdfe, #05ffa1)";
    topBorder.style.borderRadius = "4px 4px 0 0";
    this.statsContainer.appendChild(topBorder);

    // Set up flex layout to push logo to bottom
    this.statsContainer.style.display = "flex";
    this.statsContainer.style.flexDirection = "column";

    // Create a scrollable content area
    const contentArea = document.createElement("div");
    contentArea.style.flex = "1"; // Will take available space
    contentArea.style.overflow = "auto";
    contentArea.style.paddingRight = "5px"; // Space for scrollbar
    contentArea.style.marginBottom = "10px"; // Space before logo section
    this.statsContainer.appendChild(contentArea);

    // Create a footer area that stays at the bottom
    const footerArea = document.createElement("div");
    footerArea.style.marginTop = "auto"; // Push to bottom
    this.statsContainer.appendChild(footerArea);

    // Add a section title for effect selector
    const selectorTitle = document.createElement("div");
    selectorTitle.style.color = "#ff71ce";
    selectorTitle.style.fontWeight = "bold";
    selectorTitle.style.marginBottom = "10px";
    selectorTitle.style.fontSize = "14px";
    selectorTitle.style.textShadow = "0 0 5px rgba(255, 113, 206, 0.5)";
    selectorTitle.style.letterSpacing = "1px";
    selectorTitle.style.display = "flex";
    selectorTitle.style.alignItems = "center";
    selectorTitle.textContent = "Effect";

    const effectIcon = document.createElement("span");
    effectIcon.textContent = "✨";
    effectIcon.style.marginRight = "8px";
    effectIcon.style.fontSize = "16px";
    selectorTitle.prepend(effectIcon);

    contentArea.appendChild(selectorTitle);

    // Create the effect selector dropdown
    const effectSelectorContainer = document.createElement("div");
    effectSelectorContainer.style.marginBottom = "20px";
    effectSelectorContainer.style.position = "relative";

    this.effectSelector = document.createElement("select");
    this.effectSelector.style.width = "100%";
    this.effectSelector.style.padding = "6px 10px";
    this.effectSelector.style.backgroundColor = "rgba(25, 25, 35, 0.8)";
    this.effectSelector.style.color = "#01cdfe";
    this.effectSelector.style.border = "1px solid #01cdfe";
    this.effectSelector.style.borderRadius = "3px";
    this.effectSelector.style.fontFamily = "'Rajdhani', sans-serif";
    this.effectSelector.style.fontSize = "14px";
    this.effectSelector.style.boxShadow = "0 0 5px rgba(1, 205, 254, 0.3)";
    this.effectSelector.style.cursor = "pointer";
    this.effectSelector.style.transition = "all 0.2s ease";
    this.effectSelector.style.appearance = "none";

    // Add custom dropdown arrow
    const arrowContainer = document.createElement("div");
    arrowContainer.style.position = "absolute";
    arrowContainer.style.right = "10px";
    arrowContainer.style.top = "50%";
    arrowContainer.style.transform = "translateY(-50%)";
    arrowContainer.style.pointerEvents = "none";
    arrowContainer.innerHTML = "▼";
    arrowContainer.style.color = "#01cdfe";
    arrowContainer.style.fontSize = "10px";

    // Add hover effect for dropdown
    this.effectSelector.addEventListener("mouseover", () => {
      this.effectSelector!.style.boxShadow = "0 0 10px rgba(1, 205, 254, 0.6)";
      this.effectSelector!.style.borderColor = "#05ffa1";
    });

    this.effectSelector.addEventListener("mouseout", () => {
      this.effectSelector!.style.boxShadow = "0 0 5px rgba(1, 205, 254, 0.3)";
      this.effectSelector!.style.borderColor = "#01cdfe";
    });

    // Add options for our effects list
    for (const effect of effects) {
      const option = document.createElement("option");
      option.textContent = effect.name;
      option.value = effect.id;
      this.effectSelector.appendChild(option);
    }

    // Handle effect selection changes
    this.effectSelector.addEventListener("change", (e) => {
      const target = e.target as HTMLSelectElement;
      const effectId = target.value;

      try {
        // Show loading notification
        this.showNotification(
          `Loading effect: ${effects.find((e) => e.id === effectId)?.name || effectId}`,
        );

        // Update URL and reload page to load the new effect
        const url = new URL(window.location.href);
        url.searchParams.set("effect", effectId);
        window.location.href = url.toString();
      } catch (error) {
        console.error("Failed to load effect:", error);
        this.showNotification(
          `Failed to load effect: ${error instanceof Error ? error.message : String(error)}`,
          true,
        );
      }
    });

    effectSelectorContainer.appendChild(this.effectSelector);
    effectSelectorContainer.appendChild(arrowContainer);
    contentArea.appendChild(effectSelectorContainer);

    // Add a divider
    const divider = document.createElement("div");
    divider.style.height = "1px";
    divider.style.background =
      "linear-gradient(90deg, transparent, rgba(255, 113, 206, 0.5), transparent)";
    divider.style.margin = "10px 0 15px";
    contentArea.appendChild(divider);

    // Add stats section title
    const statsTitle = document.createElement("div");
    statsTitle.style.color = "#ff71ce";
    statsTitle.style.fontWeight = "bold";
    statsTitle.style.fontSize = "14px";
    statsTitle.style.marginBottom = "10px";
    statsTitle.style.textShadow = "0 0 5px rgba(255, 113, 206, 0.5)";
    statsTitle.style.letterSpacing = "1px";
    statsTitle.style.display = "flex";
    statsTitle.style.alignItems = "center";
    statsTitle.textContent = "Stats";

    const statsIcon = document.createElement("span");
    statsIcon.textContent = "📊";
    statsIcon.style.marginRight = "8px";
    statsIcon.style.fontSize = "16px";
    statsTitle.prepend(statsIcon);

    contentArea.appendChild(statsTitle);

    // Create FPS counter
    const fpsContainer = document.createElement("div");
    fpsContainer.style.display = "flex";
    fpsContainer.style.justifyContent = "space-between";
    fpsContainer.style.alignItems = "center";
    fpsContainer.style.marginBottom = "10px";

    const fpsLabel = document.createElement("div");
    fpsLabel.textContent = "FPS:";
    fpsLabel.style.color = "#FFF";

    this.fpsCounter = document.createElement("div");
    this.fpsCounter.style.color = "#05ffa1";
    this.fpsCounter.style.fontWeight = "bold";
    this.fpsCounter.style.textShadow = "0 0 5px rgba(5, 255, 161, 0.5)";
    this.fpsCounter.textContent = "60";

    fpsContainer.appendChild(fpsLabel);
    fpsContainer.appendChild(this.fpsCounter);
    contentArea.appendChild(fpsContainer);

    // Create resolution display
    const resolutionContainer = document.createElement("div");
    resolutionContainer.style.display = "flex";
    resolutionContainer.style.justifyContent = "space-between";
    resolutionContainer.style.marginBottom = "10px";

    const resolutionLabel = document.createElement("div");
    resolutionLabel.textContent = "Resolution:";
    resolutionLabel.style.color = "#FFF";

    const resolutionValue = document.createElement("div");
    resolutionValue.style.color = "#01cdfe";
    resolutionValue.style.fontWeight = "bold";
    resolutionValue.textContent = `${this.canvas?.width || 0}×${this.canvas?.height || 0}`;

    resolutionContainer.appendChild(resolutionLabel);
    resolutionContainer.appendChild(resolutionValue);
    contentArea.appendChild(resolutionContainer);

    // Add screenshot button
    const screenshotContainer = document.createElement("div");
    screenshotContainer.style.marginTop = "10px";
    screenshotContainer.style.marginBottom = "20px";

    const screenshotBtn = document.createElement("button");
    screenshotBtn.textContent = "📷 Take Screenshot";
    screenshotBtn.style.background = "transparent";
    screenshotBtn.style.color = "#05ffa1";
    screenshotBtn.style.border = "1px solid #05ffa1";
    screenshotBtn.style.padding = "6px 12px";
    screenshotBtn.style.borderRadius = "3px";
    screenshotBtn.style.cursor = "pointer";
    screenshotBtn.style.fontFamily = "'Rajdhani', sans-serif";
    screenshotBtn.style.fontSize = "13px";
    screenshotBtn.style.width = "100%";
    screenshotBtn.style.letterSpacing = "1px";
    screenshotBtn.style.boxShadow = "0 0 5px rgba(5, 255, 161, 0.3)";
    screenshotBtn.style.transition = "all 0.2s ease";

    screenshotBtn.addEventListener("mouseover", () => {
      screenshotBtn.style.background = "rgba(5, 255, 161, 0.2)";
      screenshotBtn.style.boxShadow = "0 0 10px rgba(5, 255, 161, 0.5)";
    });

    screenshotBtn.addEventListener("mouseout", () => {
      screenshotBtn.style.background = "transparent";
      screenshotBtn.style.boxShadow = "0 0 5px rgba(5, 255, 161, 0.3)";
    });

    screenshotBtn.addEventListener("click", () => this.takeScreenshot());

    screenshotContainer.appendChild(screenshotBtn);
    contentArea.appendChild(screenshotContainer);

    // Add another divider
    const divider2 = document.createElement("div");
    divider2.style.height = "1px";
    divider2.style.background =
      "linear-gradient(90deg, transparent, rgba(255, 113, 206, 0.5), transparent)";
    divider2.style.margin = "10px 0 15px";
    contentArea.appendChild(divider2);

    // Create metadata section with enhanced styling
    const metadataTitle = document.createElement("div");
    metadataTitle.style.color = "#ff71ce";
    metadataTitle.style.fontWeight = "bold";
    metadataTitle.style.fontSize = "14px";
    metadataTitle.style.marginBottom = "12px";
    metadataTitle.style.textShadow = "0 0 5px rgba(255, 113, 206, 0.5)";
    metadataTitle.style.letterSpacing = "1px";
    metadataTitle.style.display = "flex";
    metadataTitle.style.alignItems = "center";
    metadataTitle.style.justifyContent = "space-between"; // Spread content

    // Add main title with icon
    const titleText = document.createElement("div");
    titleText.style.display = "flex";
    titleText.style.alignItems = "center";
    titleText.textContent = "Metadata";

    const metadataIcon = document.createElement("span");
    metadataIcon.textContent = "🔖";
    metadataIcon.style.marginRight = "8px";
    metadataIcon.style.fontSize = "16px";
    titleText.prepend(metadataIcon);

    // Add a small tag badge
    const badge = document.createElement("div");
    badge.textContent = "EFFECT INFO";
    badge.style.fontSize = "9px";
    badge.style.background = "rgba(5, 255, 161, 0.2)";
    badge.style.color = "#05ffa1";
    badge.style.padding = "2px 6px";
    badge.style.borderRadius = "10px";
    badge.style.letterSpacing = "0.8px";
    badge.style.fontWeight = "normal";
    badge.style.border = "1px solid rgba(5, 255, 161, 0.3)";
    badge.style.boxShadow = "0 0 5px rgba(5, 255, 161, 0.2)";
    badge.style.textTransform = "uppercase";

    // Add elements to title
    metadataTitle.appendChild(titleText);
    metadataTitle.appendChild(badge);

    contentArea.appendChild(metadataTitle);

    // Create metadata container
    this.metadataContainer = document.createElement("div");
    this.metadataContainer.style.fontSize = "13px";
    this.metadataContainer.style.color = "#b4b4b4";
    this.metadataContainer.style.height = "auto"; // Auto height to fit content
    this.metadataContainer.style.overflow = "visible"; // No scrollbar
    this.metadataContainer.style.marginBottom = "15px"; // Space before logo
    this.metadataContainer.style.background = "rgba(10, 10, 20, 0.5)"; // Slightly darker background
    this.metadataContainer.style.borderRadius = "3px";
    this.metadataContainer.style.padding = "8px";
    this.metadataContainer.style.border = "1px solid rgba(1, 205, 254, 0.15)"; // Subtle border
    this.metadataContainer.style.boxShadow =
      "0 0 10px rgba(1, 205, 254, 0.08) inset"; // Inner glow

    contentArea.appendChild(this.metadataContainer);

    // We'll add a divider between content and logo later

    // Add logo as a clickable link
    const logoContainer = document.createElement("div");
    logoContainer.style.display = "flex";
    logoContainer.style.justifyContent = "center";
    logoContainer.style.alignItems = "center";
    logoContainer.style.marginBottom = "10px";

    // Create a link element
    const logoLink = document.createElement("a");
    logoLink.href = "https://github.com/hyperb1iss/lightscript-workshop";
    logoLink.target = "_blank"; // Open in new tab
    logoLink.title = "View on GitHub";
    logoLink.style.cursor = "pointer";
    logoLink.style.display = "block";
    logoLink.style.width = "80%";
    logoLink.style.maxWidth = "180px";
    logoLink.style.margin = "0 auto";
    logoLink.style.transition = "transform 0.2s ease, filter 0.2s ease";

    // Add hover effects
    logoLink.addEventListener("mouseover", () => {
      logoLink.style.transform = "scale(1.05)";
      logo.style.filter = "drop-shadow(0 0 10px rgba(1, 205, 254, 0.8))";
    });

    logoLink.addEventListener("mouseout", () => {
      logoLink.style.transform = "scale(1)";
      logo.style.filter = "drop-shadow(0 0 5px rgba(1, 205, 254, 0.5))";
    });

    const logo = document.createElement("img");
    logo.src = "/assets/logo.png";
    logo.alt = "LightScript Logo";
    logo.style.width = "100%"; // Full width of the container
    logo.style.height = "auto";
    logo.style.display = "block";
    logo.style.filter = "drop-shadow(0 0 5px rgba(1, 205, 254, 0.5))"; // Add glow effect

    logoLink.appendChild(logo);
    logoContainer.appendChild(logoLink);
    // Add a divider to separate the content from the logo
    const logoSeparator = document.createElement("div");
    logoSeparator.style.height = "1px";
    logoSeparator.style.background =
      "linear-gradient(90deg, transparent, rgba(255, 113, 206, 0.5), transparent)";
    logoSeparator.style.margin = "0 0 10px 0";
    footerArea.appendChild(logoSeparator);

    footerArea.appendChild(logoContainer);

    // Add to container
    container.appendChild(this.statsContainer);

    // Initial update of metadata
    this.updateMetadataDisplay();
  }

  /**
   * Create the controls panel on the right side
   */
  private createControlsPanel(container: HTMLElement): void {
    this.controlsContainer = document.createElement("div");
    this.controlsContainer.className = "controls-container";
    this.controlsContainer.style.position = "relative";
    this.controlsContainer.style.height = "calc(100vh - 20px)"; // Full height minus padding
    this.controlsContainer.style.display = "flex";
    this.controlsContainer.style.flexDirection = "column";
    this.controlsContainer.style.background = "rgba(12, 12, 22, 0.85)";
    this.controlsContainer.style.padding = "10px";
    this.controlsContainer.style.borderRadius = "4px";
    this.controlsContainer.style.zIndex = "100";
    this.controlsContainer.style.transition =
      "all 0.3s cubic-bezier(0.25, 1, 0.5, 1)";
    this.controlsContainer.style.boxShadow =
      "0 0 15px rgba(1, 205, 254, 0.2), 0 0 5px rgba(255, 113, 206, 0.2)";
    this.controlsContainer.style.border = "1px solid rgba(255, 113, 206, 0.2)";
    this.controlsContainer.style.backdropFilter = "blur(5px)";
    this.controlsContainer.style.fontFamily = "'Rajdhani', sans-serif";
    this.controlsContainer.style.width = "220px";

    // Add glowing top border
    const topBorder = document.createElement("div");
    topBorder.style.position = "absolute";
    topBorder.style.top = "0";
    topBorder.style.left = "0";
    topBorder.style.right = "0";
    topBorder.style.height = "2px";
    topBorder.style.background =
      "linear-gradient(90deg, #ff71ce, #01cdfe, #05ffa1)";
    topBorder.style.borderRadius = "4px 4px 0 0";
    this.controlsContainer.appendChild(topBorder);

    // Add a header with toggle button
    const header = document.createElement("div");
    header.style.display = "flex";
    header.style.justifyContent = "space-between";
    header.style.alignItems = "center";
    header.style.marginBottom = "10px";
    header.style.borderBottom = "1px solid rgba(255, 113, 206, 0.2)";
    header.style.paddingBottom = "5px";
    header.style.marginTop = "5px";

    const title = document.createElement("span");
    title.style.color = "#ff71ce";
    title.style.fontWeight = "bold";
    title.style.fontSize = "14px";
    title.style.textShadow = "0 0 5px rgba(255, 113, 206, 0.5)";
    title.style.letterSpacing = "1px";
    title.textContent = "Controls";

    const toggleBtn = document.createElement("button");
    toggleBtn.textContent = "—";
    toggleBtn.style.background = "transparent";
    toggleBtn.style.border = "1px solid #01cdfe";
    toggleBtn.style.color = "#01cdfe";
    toggleBtn.style.width = "24px";
    toggleBtn.style.height = "24px";
    toggleBtn.style.borderRadius = "3px";
    toggleBtn.style.cursor = "pointer";
    toggleBtn.style.fontSize = "14px";
    toggleBtn.style.display = "flex";
    toggleBtn.style.justifyContent = "center";
    toggleBtn.style.alignItems = "center";
    toggleBtn.style.boxShadow = "0 0 5px rgba(1, 205, 254, 0.3)";
    toggleBtn.style.transition = "all 0.2s ease";
    toggleBtn.title = "Toggle controls panel (Ctrl+C)";

    toggleBtn.addEventListener("mouseover", () => {
      toggleBtn.style.boxShadow = "0 0 10px rgba(1, 205, 254, 0.6)";
    });

    toggleBtn.addEventListener("mouseout", () => {
      toggleBtn.style.boxShadow = "0 0 5px rgba(1, 205, 254, 0.3)";
    });

    toggleBtn.addEventListener("click", () => this.toggleControls());

    header.appendChild(title);
    header.appendChild(toggleBtn);
    this.controlsContainer.appendChild(header);

    // Create a content container with flex-grow to take available space
    const contentContainer = document.createElement("div");
    contentContainer.style.display = "flex";
    contentContainer.style.flexDirection = "column";
    contentContainer.style.flex = "1";
    contentContainer.style.overflow = "hidden"; // Hide overflow until we add content
    contentContainer.style.position = "relative"; // For proper sizing

    // Create the inner scrollable container for controls
    const innerContainer = document.createElement("div");
    innerContainer.id = "controls-inner";
    innerContainer.style.overflow = "auto";
    innerContainer.style.maxHeight = "calc(100vh - 130px)"; // Leave room for reset button
    innerContainer.style.paddingRight = "5px"; // Add room for scrollbar
    innerContainer.style.marginBottom = "10px"; // Space before reset button
    innerContainer.style.marginRight = "-5px"; // Compensate for padding to align with container
    contentContainer.appendChild(innerContainer);

    // Add reset button at the bottom of the controls panel, outside of the scrollable area
    const resetContainer = document.createElement("div");
    resetContainer.style.marginTop = "auto"; // Push to bottom of flex container
    resetContainer.style.paddingTop = "10px";
    resetContainer.style.borderTop = "1px solid rgba(255, 113, 206, 0.2)";
    resetContainer.style.display = "flex";
    resetContainer.style.justifyContent = "center";

    const resetBtn = document.createElement("button");
    resetBtn.textContent = "↺ Reset All Controls";
    resetBtn.style.background = "transparent";
    resetBtn.style.color = "#01cdfe";
    resetBtn.style.border = "1px solid #01cdfe";
    resetBtn.style.padding = "8px 15px";
    resetBtn.style.borderRadius = "3px";
    resetBtn.style.cursor = "pointer";
    resetBtn.style.fontFamily = "'Rajdhani', sans-serif";
    resetBtn.style.fontSize = "13px";
    resetBtn.style.letterSpacing = "1px";
    resetBtn.style.boxShadow = "0 0 5px rgba(1, 205, 254, 0.3)";
    resetBtn.style.transition = "all 0.2s ease";
    resetBtn.title = "Reset all controls to default values";

    resetBtn.addEventListener("mouseover", () => {
      resetBtn.style.background = "rgba(1, 205, 254, 0.2)";
      resetBtn.style.boxShadow = "0 0 10px rgba(1, 205, 254, 0.5)";
    });

    resetBtn.addEventListener("mouseout", () => {
      resetBtn.style.background = "transparent";
      resetBtn.style.boxShadow = "0 0 5px rgba(1, 205, 254, 0.3)";
    });

    resetBtn.addEventListener("click", () => this.resetControls());

    resetContainer.appendChild(resetBtn);
    contentContainer.appendChild(resetContainer);

    // Add the content container to the main controls container
    this.controlsContainer.appendChild(contentContainer);

    container.appendChild(this.controlsContainer);
  }

  /**
   * Toggle collapsing the controls panel
   */
  private toggleControls(): void {
    this.controlsCollapsed = !this.controlsCollapsed;

    if (this.controlsContainer) {
      const contentContainer = this.controlsContainer.querySelector(
        "div[style*='flex-direction: column']",
      ) as HTMLDivElement;
      const toggleBtn = this.controlsContainer.querySelector("button");

      if (this.controlsCollapsed) {
        if (contentContainer) contentContainer.style.display = "none";
        if (toggleBtn) toggleBtn.textContent = "+";
        this.controlsContainer.style.transform = "translateX(185px)";
        this.controlsContainer.style.opacity = "0.9";
        this.controlsContainer.style.width = "40px";
        this.controlsContainer.style.boxShadow =
          "0 0 10px rgba(255, 113, 206, 0.3)";
      } else {
        this.controlsContainer.style.transform = "translateX(0)";
        this.controlsContainer.style.opacity = "1";
        this.controlsContainer.style.width = "220px";
        this.controlsContainer.style.boxShadow =
          "0 0 15px rgba(1, 205, 254, 0.2), 0 0 5px rgba(255, 113, 206, 0.2)";

        // Need a small delay before showing inner content to let the animation happen
        setTimeout(() => {
          if (contentContainer) contentContainer.style.display = "flex";
          if (toggleBtn) toggleBtn.textContent = "—";
        }, 150);
      }
    }
  }

  /**
   * Handle window resize events
   */
  private handleResize(): void {
    if (this.canvas) {
      // Make canvas responsive within container
      const canvasContainer = this.canvas.parentElement;
      if (canvasContainer) {
        const maxWidth = Math.min(window.innerWidth - 40, 1200);
        const maxHeight = window.innerHeight - 40;
        const aspectRatio = this.canvas.width / this.canvas.height;

        let width, height;

        if (maxWidth / aspectRatio <= maxHeight) {
          width = maxWidth;
          height = maxWidth / aspectRatio;
        } else {
          height = maxHeight;
          width = height * aspectRatio;
        }

        this.canvas.style.width = `${width}px`;
        this.canvas.style.height = `${height}px`;
      }
    }
  }

  /**
   * Load an effect and its controls
   */
  public async loadEffect(effectId: string): Promise<void> {
    debug(`Loading effect: ${effectId}`);

    // Find the effect definition
    const effect = effects.find((e) => e.id === effectId);
    if (!effect) {
      throw new Error(`Effect not found: ${effectId}`);
    }

    this.currentEffect = effect;

    // Clear any global window variables from previous effects
    this.clearGlobalVariables();

    try {
      // In Vite, we can use a special import to get the template content
      const templatePath = effect.template.replace(/^\.\//, "/src/");

      // Parse the template for controls
      const templateResponse = await fetch(templatePath);
      if (!templateResponse.ok) {
        throw new Error(`Failed to load template from ${templatePath}`);
      }

      const templateHtml = await templateResponse.text();
      this.controlDefinitions = parseControlsFromTemplate(templateHtml);

      debug(
        `Loaded ${this.controlDefinitions.length} controls for ${effect.name}`,
      );

      // Initialize control values with defaults
      this.controlValues = {};
      for (const def of this.controlDefinitions) {
        this.controlValues[def.id] = def.default;

        // Set global variables for backwards compatibility
        window[def.id] = def.default;
      }

      // Generate UI for controls
      setTimeout(() => {
        this.generateControlUI();
        debug("Controls UI generated");
      }, 0);

      // Set page title to include effect name
      document.title = `${effect.name} | SignalRGB Dev`;

      // Update UI to reflect current effect
      this.updateMetadataDisplay();
    } catch (error) {
      debug("Error loading effect:", error);
      throw error;
    }
  }

  /**
   * Update UI elements with current effect info
   */
  private updateEffectInfo(effect: (typeof effects)[0]): void {
    // Set effect info in controls panel title
    const title = this.controlsContainer?.querySelector("span");
    if (title) {
      title.textContent = `${effect.name} Controls`;
    }

    // Update the metadata panel with effect details
    const metadataSection = document.getElementById("effect-metadata");
    if (metadataSection) {
      metadataSection.innerHTML = ""; // Clear existing content

      const metadataTitle = document.createElement("div");
      metadataTitle.style.borderBottom = "1px solid rgba(255, 113, 206, 0.2)";
      metadataTitle.style.paddingBottom = "5px";
      metadataTitle.style.marginBottom = "8px";
      metadataTitle.style.color = "#01cdfe";
      metadataTitle.style.fontSize = "13px";
      metadataTitle.style.fontWeight = "bold";
      metadataTitle.textContent = "Effect Info";
      metadataSection.appendChild(metadataTitle);

      // Create effect metadata list
      const createMetadataItem = (
        label: string,
        value: string,
        color: string = "#fffb96",
      ) => {
        const container = document.createElement("div");
        container.style.marginBottom = "6px";

        const labelEl = document.createElement("div");
        labelEl.style.color = "#b967ff";
        labelEl.style.fontSize = "12px";
        labelEl.textContent = label;
        container.appendChild(labelEl);

        const valueEl = document.createElement("div");
        valueEl.style.color = color;
        valueEl.style.fontSize = "13px";
        valueEl.style.marginLeft = "8px";
        valueEl.style.wordBreak = "break-word";
        valueEl.textContent = value;
        container.appendChild(valueEl);

        return container;
      };

      // Add effect details
      metadataSection.appendChild(
        createMetadataItem("Name", effect.name, "#ff71ce"),
      );

      if (effect.description) {
        metadataSection.appendChild(
          createMetadataItem("Description", effect.description),
        );
      }

      if (effect.author) {
        metadataSection.appendChild(
          createMetadataItem("Author", effect.author, "#05ffa1"),
        );
      }

      metadataSection.appendChild(createMetadataItem("ID", effect.id));

      // Add control count
      metadataSection.appendChild(
        createMetadataItem(
          "Controls",
          `${this.controlDefinitions.length} parameters`,
          "#01cdfe",
        ),
      );
    }
  }

  /**
   * Generate UI elements for all controls
   */
  private generateControlUI(): void {
    const innerContainer = document.getElementById("controls-inner");
    if (!innerContainer) return;

    // Clear existing controls
    innerContainer.innerHTML = "";

    // Generate controls
    const controlsElement = generateControlUI(
      this.controlDefinitions,
      this.controlValues,
      this.handleControlChange.bind(this),
    );

    innerContainer.appendChild(controlsElement);
  }

  /**
   * Handle control value changes
   */
  private handleControlChange(id: string, value: unknown): void {
    debug(`Control changed: ${id} = ${value}`);

    // Update internal state
    this.controlValues[id] = value;

    // Update global variable for backward compatibility
    window[id] = value;

    // Try to call the global update function if it exists
    if (typeof window.update === "function") {
      window.update();
    }
  }

  /**
   * Clear global variables used by effects
   */
  private clearGlobalVariables(): void {
    if (this.controlDefinitions.length > 0) {
      for (const def of this.controlDefinitions) {
        delete window[def.id];
      }
    }
  }

  /**
   * Preload an effect module by dynamically importing it
   */
  public async preloadEffectModule(effectId: string): Promise<void> {
    const effect = effects.find((e) => e.id === effectId);
    if (!effect) {
      throw new Error(`Effect not found: ${effectId}`);
    }

    try {
      // Use a simpler approach - just update the URL and reload
      const url = new URL(window.location.href);
      url.searchParams.set("effect", effectId);
      window.location.href = url.toString();
    } catch (error) {
      debug("Error changing effect:", error);
      throw error;
    }
  }

  /**
   * Start monitoring FPS
   */
  public startFPSMonitor(): void {
    this.lastTime = performance.now();

    const updateFPS = () => {
      const now = performance.now();
      this.frameCount++;

      // Update every second
      if (now - this.lastTime >= 1000) {
        this.fpsValue = Math.round(
          (this.frameCount * 1000) / (now - this.lastTime),
        );

        if (this.fpsCounter) {
          this.fpsCounter.textContent = `${this.fpsValue} FPS`;

          // Color code the FPS counter
          if (this.fpsValue > 55) {
            this.fpsCounter.style.color = "#05ffa1"; // Great
            this.fpsCounter.style.textShadow = "0 0 5px rgba(5, 255, 161, 0.5)";
          } else if (this.fpsValue > 30) {
            this.fpsCounter.style.color = "#fffb96"; // OK
            this.fpsCounter.style.textShadow =
              "0 0 5px rgba(255, 251, 150, 0.5)";
          } else {
            this.fpsCounter.style.color = "#ff71ce"; // Bad
            this.fpsCounter.style.textShadow =
              "0 0 5px rgba(255, 113, 206, 0.5)";
          }
        }

        this.frameCount = 0;
        this.lastTime = now;
      }

      requestAnimationFrame(updateFPS);
    };

    requestAnimationFrame(updateFPS);
  }

  /**
   * Take a screenshot of the canvas
   */
  private takeScreenshot(): void {
    if (!this.canvas) return;

    try {
      // Get the current time for filename
      const date = new Date();
      const timestamp = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, "0")}${date.getDate().toString().padStart(2, "0")}_${date.getHours().toString().padStart(2, "0")}${date.getMinutes().toString().padStart(2, "0")}${date.getSeconds().toString().padStart(2, "0")}`;

      // Get effect name for filename
      const effectName = this.currentEffect?.name || "effect";
      const safeEffectName = effectName
        .replace(/[^a-z0-9]/gi, "_")
        .toLowerCase();

      // Create download link
      const link = document.createElement("a");
      link.download = `signalrgb_${safeEffectName}_${timestamp}.png`;

      // Convert canvas to data URL - with preserveDrawingBuffer to ensure screenshot works
      // Need to get canvas content correctly
      try {
        // Force a render frame to ensure content is current
        if (typeof window.update === "function") {
          window.update();
        }

        // Need to preserve drawing buffer for screenshots
        const dataUrl = this.canvas.toDataURL("image/png");
        link.href = dataUrl;

        // Log data length as a sanity check
        debug(`Screenshot data length: ${dataUrl.length}`);
        if (dataUrl.length < 1000) {
          debug("Warning: Screenshot may be empty");
        }
      } catch (e) {
        debug("Error getting canvas data:", e);
        throw new Error("Could not capture canvas content");
      }

      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Create a little flash effect on the canvas
      const flashEffect = document.createElement("div");
      flashEffect.style.position = "absolute";
      flashEffect.style.top = "0";
      flashEffect.style.left = "0";
      flashEffect.style.width = "100%";
      flashEffect.style.height = "100%";
      flashEffect.style.backgroundColor = "white";
      flashEffect.style.opacity = "0.3";
      flashEffect.style.pointerEvents = "none";
      flashEffect.style.zIndex = "999";
      flashEffect.style.animation = "flash 0.5s ease-out forwards";

      // Add flash animation style
      const style = document.createElement("style");
      style.textContent = `
        @keyframes flash {
          0% { opacity: 0.3; }
          100% { opacity: 0; }
        }
      `;
      document.head.appendChild(style);

      // Add flash effect to body and remove after animation
      document.body.appendChild(flashEffect);
      setTimeout(() => {
        document.body.removeChild(flashEffect);
        document.head.removeChild(style);
      }, 500);

      console.log(`Screenshot saved: ${link.download}`);

      // Show success notification
      this.showNotification("Screenshot saved!");
    } catch (error) {
      console.error("Failed to take screenshot:", error);
      this.showNotification("Failed to take screenshot!", true);
    }
  }

  /**
   * Show a notification to the user
   */
  public showNotification(message: string, isError = false): void {
    const notification = document.createElement("div");
    notification.textContent = message;
    notification.style.position = "fixed";
    notification.style.bottom = "20px";
    notification.style.left = "50%";
    notification.style.transform = "translateX(-50%)";
    notification.style.backgroundColor = "rgba(12, 12, 22, 0.9)";
    notification.style.color = isError ? "#ff71ce" : "#05ffa1";
    notification.style.padding = "10px 20px";
    notification.style.borderRadius = "4px";
    notification.style.fontFamily = "'Rajdhani', sans-serif";
    notification.style.zIndex = "9999";
    notification.style.boxShadow = isError
      ? "0 0 15px rgba(255, 113, 206, 0.4)"
      : "0 0 15px rgba(5, 255, 161, 0.4)";
    notification.style.border = isError
      ? "1px solid rgba(255, 113, 206, 0.3)"
      : "1px solid rgba(5, 255, 161, 0.3)";
    notification.style.transition =
      "opacity 0.5s ease-out, transform 0.3s ease-out";

    document.body.appendChild(notification);

    // Add entrance animation
    notification.style.transform = "translateX(-50%) translateY(20px)";
    setTimeout(() => {
      notification.style.transform = "translateX(-50%) translateY(0)";
    }, 10);

    // Remove after delay
    setTimeout(() => {
      notification.style.opacity = "0";
      notification.style.transform = "translateX(-50%) translateY(20px)";
      setTimeout(() => notification.remove(), 500);
    }, 3000);
  }

  /**
   * Reset all controls to their default values
   */
  private resetControls(): void {
    // Check if we should ask for confirmation
    const shouldConfirm = confirm("Reset all controls to default values?");
    if (!shouldConfirm) return;

    // Reset all controls to default values
    for (const def of this.controlDefinitions) {
      // Update internal state
      this.controlValues[def.id] = def.default;

      // Update global variable
      window[def.id] = def.default;

      // Update UI elements
      const input = document.querySelector(`[data-control-id="${def.id}"]`) as
        | HTMLInputElement
        | HTMLSelectElement;
      if (input) {
        if (input.type === "checkbox") {
          (input as HTMLInputElement).checked = Boolean(def.default);
        } else if (input.type === "range") {
          (input as HTMLInputElement).value = String(def.default);

          // Also update value display
          const valueDisplay =
            input.parentElement?.querySelector(".control-value");
          if (valueDisplay) {
            valueDisplay.textContent = String(def.default);
          }
        } else {
          input.value = String(def.default);
        }
      }
    }

    // Call the global update function
    if (typeof window.update === "function") {
      window.update(true);
    }

    // Show success notification
    this.showNotification("Controls reset to default values");
  }

  /**
   * Update metadata display with current effect info
   */
  private updateMetadataDisplay(): void {
    if (!this.metadataContainer || !this.currentEffect) return;

    // Clear existing content
    this.metadataContainer.innerHTML = "";

    // Create a table for metadata with enhanced styling
    const table = document.createElement("table");
    table.style.width = "100%";
    table.style.borderCollapse = "separate";
    table.style.borderSpacing = "0 4px"; // Add vertical spacing between rows
    table.style.tableLayout = "fixed"; // Fixed layout to prevent horizontal overflow

    // Helper function to add a metadata row
    const addMetadataRow = (
      label: string,
      value?: string | null,
      highlight: boolean = false,
    ) => {
      if (value === undefined || value === null) return;

      // Create row with hover effect
      const row = document.createElement("tr");
      row.style.transition = "background 0.2s ease";

      row.addEventListener("mouseover", () => {
        row.style.background = "rgba(1, 205, 254, 0.1)";
      });

      row.addEventListener("mouseout", () => {
        row.style.background = "transparent";
      });

      // Create label cell with enhanced styling
      const labelCell = document.createElement("td");
      labelCell.textContent = `${label}`;
      labelCell.style.padding = "4px 8px 4px 0";
      labelCell.style.color = "#01cdfe"; // Blue label color
      labelCell.style.verticalAlign = "top";
      labelCell.style.width = "38%";
      labelCell.style.fontSize = "12px";
      labelCell.style.fontWeight = "500";
      labelCell.style.textTransform = "uppercase";
      labelCell.style.letterSpacing = "0.5px";

      // Create value cell with appropriate styling
      const valueCell = document.createElement("td");
      valueCell.textContent = value;
      valueCell.style.padding = "4px 0";
      valueCell.style.textAlign = "right";
      valueCell.style.wordBreak = "break-word";
      valueCell.style.width = "62%";

      // Apply highlight color if specified
      if (highlight) {
        // Create a highlighted value with a special indicator
        valueCell.style.color = "#05ffa1"; // Highlight color - green
        valueCell.style.fontWeight = "bold";
        valueCell.style.textShadow = "0 0 8px rgba(5, 255, 161, 0.3)";

        // Add a small highlight indicator dot
        const highlightDot = document.createElement("span");
        highlightDot.textContent = "•";
        highlightDot.style.color = "#05ffa1";
        highlightDot.style.marginRight = "4px";
        highlightDot.style.fontSize = "14px";
        highlightDot.style.opacity = "0.7";
        highlightDot.style.textShadow = "0 0 5px rgba(5, 255, 161, 0.5)";

        // Replace text content with formatted version
        valueCell.textContent = "";
        valueCell.appendChild(highlightDot);
        valueCell.appendChild(document.createTextNode(value));
      } else {
        valueCell.style.color = "#f0f0f0"; // Regular text - brighter white
      }

      row.appendChild(labelCell);
      row.appendChild(valueCell);
      table.appendChild(row);
    };

    // Add core metadata fields with some highlighted
    addMetadataRow("Name", this.currentEffect.name, true);
    addMetadataRow("ID", this.currentEffect.id);
    addMetadataRow("Author", this.currentEffect.author, true);

    // Add description with special handling for long text
    if (this.currentEffect.description) {
      const descValue = this.currentEffect.description;
      // If description is long, truncate it
      const truncatedDesc =
        descValue.length > 60 ? descValue.substring(0, 57) + "..." : descValue;
      addMetadataRow("Description", truncatedDesc);
    }

    // Add control count with highlight
    addMetadataRow("Controls", this.controlDefinitions.length.toString(), true);

    this.metadataContainer.appendChild(table);
  }

  /**
   * Update FPS display
   */
  public updateFps(fps: number): void {
    if (this.fpsCounter) {
      // Update FPS counter text
      this.fpsCounter.textContent = Math.round(fps).toString();

      // Update color based on FPS value
      if (fps >= 55) {
        this.fpsCounter.style.color = "#05ffa1"; // Green for good FPS
      } else if (fps >= 30) {
        this.fpsCounter.style.color = "#ffe600"; // Yellow for medium FPS
      } else {
        this.fpsCounter.style.color = "#ff71ce"; // Pink/red for low FPS
      }
    }
  }

  /**
   * Change the current effect
   */
  public changeEffect(effectId: string): void {
    const effect = effects.find((e) => e.id === effectId);
    if (effect) {
      this.currentEffect = effect;

      if (this.effectSelector) {
        this.effectSelector.value = effectId;
      }

      this.updateMetadataDisplay();
    }
  }
}
