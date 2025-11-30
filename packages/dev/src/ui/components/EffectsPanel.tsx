import { FunctionComponent } from 'preact'
import type { FPS_CAP_OPTIONS, RESOLUTION_PRESETS, ResolutionPreset } from '../../engine/preact-engine'

interface EffectsPanelProps {
    effects: Array<{
        id: string
        name?: string
        description?: string
        author?: string
    }>
    currentEffectId: string
    currentResolution: ResolutionPreset
    fps: number
    fpsCap: number
    resolutionPresets: typeof RESOLUTION_PRESETS
    fpsCapOptions: typeof FPS_CAP_OPTIONS
    onEffectChange: (effectId: string) => void
    onResolutionChange: (preset: ResolutionPreset) => void
    onFpsCapChange: (fps: number) => void
    onSavePreview: () => void
    onOpenDocs?: () => void
}

export const EffectsPanel: FunctionComponent<EffectsPanelProps> = ({
    effects = [],
    currentEffectId,
    currentResolution,
    fps,
    fpsCap,
    resolutionPresets,
    fpsCapOptions,
    onEffectChange,
    onResolutionChange,
    onFpsCapChange,
    onSavePreview,
    onOpenDocs,
}) => {
    const currentEffect = effects && effects.length > 0 ? effects.find((e) => e.id === currentEffectId) : null

    return (
        <div className="effects-panel">
            <div className="effects-header">
                <h3>🌠 Effects</h3>
                <button className="docs-open" onClick={onOpenDocs} title="Open Documentation" type="button">
                    📚 Docs
                </button>
            </div>

            <div className="effects-selector">
                <select
                    disabled={!effects || effects.length === 0}
                    onChange={(e: Event) => onEffectChange((e.target as HTMLSelectElement).value)}
                    value={currentEffectId}
                >
                    {!effects || effects.length === 0 ? (
                        <option value="">No effects available</option>
                    ) : (
                        effects.map((effect) => (
                            <option key={effect.id} value={effect.id}>
                                {effect.name || effect.id}
                            </option>
                        ))
                    )}
                </select>
            </div>

            <div className="stats-panel">
                <div className="stats-header">
                    <h4>📶 Display</h4>
                </div>
                <div className="stats-content">
                    <div className="stat-item">
                        <span className="stat-label">FPS</span>
                        <span className="stat-value">{fps.toFixed(1)}</span>
                    </div>

                    <div className="stat-item stat-item-select">
                        <span className="stat-label">Resolution</span>
                        <select
                            className="stat-select"
                            onChange={(e: Event) =>
                                onResolutionChange((e.target as HTMLSelectElement).value as ResolutionPreset)
                            }
                            value={currentResolution}
                        >
                            {Object.entries(resolutionPresets).map(([key, preset]) => (
                                <option key={key} value={key}>
                                    {preset.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="stat-item stat-item-select">
                        <span className="stat-label">FPS Cap</span>
                        <select
                            className="stat-select"
                            onChange={(e: Event) => onFpsCapChange(Number((e.target as HTMLSelectElement).value))}
                            value={fpsCap}
                        >
                            {fpsCapOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {currentEffect && (
                <div className="metadata-panel">
                    <div className="metadata-header">
                        <h4>🔬 Effect Info</h4>
                    </div>
                    <div className="metadata-content">
                        <div className="metadata-item">
                            <span className="metadata-label">Name</span>
                            <span className="metadata-value highlight">{currentEffect.name || currentEffect.id}</span>
                        </div>
                        <div className="metadata-item">
                            <span className="metadata-label">ID</span>
                            <span className="metadata-value">{currentEffect.id}</span>
                        </div>
                        {currentEffect.author && (
                            <div className="metadata-item">
                                <span className="metadata-label">Author</span>
                                <span className="metadata-value highlight">{currentEffect.author}</span>
                            </div>
                        )}
                        {currentEffect.description && (
                            <div className="metadata-item">
                                <span className="metadata-label">Description</span>
                                <span className="metadata-value">
                                    {currentEffect.description && currentEffect.description.length > 60
                                        ? `${currentEffect.description.substring(0, 57)}...`
                                        : currentEffect.description}
                                </span>
                            </div>
                        )}
                        <div className="metadata-item">
                            <span className="metadata-label">Controls</span>
                            <span className="metadata-value highlight">🔌 {window.controlsCount || '0'}</span>
                        </div>
                    </div>
                </div>
            )}

            <div className="actions-panel">
                <button
                    className="screenshot-button"
                    onClick={onSavePreview}
                    title="Save a 1024×1024 preview image"
                    type="button"
                >
                    🖼️ Save Preview (1024×1024)
                </button>
            </div>

            {/* Logo at the bottom */}
            <div className="logo-separator" />
            <div className="logo-container">
                <a
                    className="logo-link"
                    href="https://github.com/hyperb1iss/lightscript-workshop"
                    rel="noopener"
                    target="_blank"
                    title="View on GitHub"
                >
                    <img alt="LightScript Logo" className="logo-image" src="/assets/logo.png" />
                </a>
            </div>
        </div>
    )
}
