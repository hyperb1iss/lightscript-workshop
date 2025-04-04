import { h, FunctionComponent } from 'preact';
import { useEffect, useState } from 'preact/hooks';

interface EffectsPanelProps {
  effects: Array<{
    id: string;
    name: string;
    description: string;
    author: string;
    entry: string;
    template: string;
  }>;
  currentEffectId: string;
  fps: number;
  onEffectChange: (effectId: string) => void;
  onTakeScreenshot: () => void;
}

export const EffectsPanel: FunctionComponent<EffectsPanelProps> = ({
  effects = [],
  currentEffectId,
  fps,
  onEffectChange,
  onTakeScreenshot
}) => {
  const currentEffect = effects && effects.length > 0 
    ? effects.find(e => e.id === currentEffectId) 
    : null;
    
  const [canvasWidth, setCanvasWidth] = useState(0);
  const [canvasHeight, setCanvasHeight] = useState(0);
  
  // Get canvas dimensions on mount
  useEffect(() => {
    const canvas = document.getElementById('exCanvas') as HTMLCanvasElement;
    if (canvas) {
      setCanvasWidth(canvas.width);
      setCanvasHeight(canvas.height);
    }
  }, []);
  
  return (
    <div className="effects-panel">
      <div className="effects-header">
        <h3>🌠 Effects</h3>
      </div>
      
      <div className="effects-selector">
        <select 
          value={currentEffectId}
          onChange={(e) => onEffectChange((e.target as HTMLSelectElement).value)}
          disabled={!effects || effects.length === 0}
        >
          {!effects || effects.length === 0 ? (
            <option value="">No effects available</option>
          ) : (
            effects.map(effect => (
              <option key={effect.id} value={effect.id}>
                {effect.name}
              </option>
            ))
          )}
        </select>
      </div>
      
      <div className="stats-panel">
        <div className="stats-header">
          <h4>📶 Stats</h4>
        </div>
        <div className="stats-content">
          <div className="stat-item">
            <span className="stat-label">FPS</span>
            <span className="stat-value">{fps.toFixed(1)}</span>
          </div>
          
          <div className="stat-item">
            <span className="stat-label">Resolution</span>
            <span className="stat-value">{canvasWidth}×{canvasHeight}</span>
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
              <span className="metadata-value highlight">{currentEffect.name}</span>
            </div>
            <div className="metadata-item">
              <span className="metadata-label">ID</span>
              <span className="metadata-value">{currentEffect.id}</span>
            </div>
            <div className="metadata-item">
              <span className="metadata-label">Author</span>
              <span className="metadata-value highlight">{currentEffect.author}</span>
            </div>
            <div className="metadata-item">
              <span className="metadata-label">Description</span>
              <span className="metadata-value">
                {currentEffect.description && currentEffect.description.length > 60 
                  ? `${currentEffect.description.substring(0, 57)}...` 
                  : currentEffect.description || 'No description'}
              </span>
            </div>
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
          onClick={onTakeScreenshot}
          title="Take a screenshot of the current effect"
        >
          💾 Take Screenshot
        </button>
      </div>
      
      {/* Logo at the bottom */}
      <div className="logo-separator"></div>
      <div className="logo-container">
        <a 
          href="https://github.com/hyperb1iss/lightscript-workshop" 
          target="_blank" 
          title="View on GitHub"
          className="logo-link"
        >
          <img 
            src="/assets/logo.png" 
            alt="LightScript Logo" 
            className="logo-image"
          />
        </a>
      </div>
    </div>
  );
}; 