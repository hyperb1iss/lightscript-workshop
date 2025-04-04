import { h, FunctionComponent } from 'preact';
import { useState } from 'preact/hooks';
import { SparklingName } from './SparklingName';

interface WelcomeModalProps {
  onClose: () => void;
}

export const WelcomeModal: FunctionComponent<WelcomeModalProps> = ({ onClose }) => {
  const [dontShowAgain, setDontShowAgain] = useState(false);
  
  const handleStart = () => {
    // Save preference if "don't show again" is checked
    if (dontShowAgain) {
      localStorage.setItem('hideWelcomeScreen', 'true');
    }
    
    // Call the onClose callback
    onClose();
  };
  
  return (
    <div className="welcome-modal">
      <div className="welcome-title">
        <span>🌠</span>
        <SparklingName 
          name="LightScript Workshop" 
          sparkleCount={20} 
          gradient={true}
          className="workshop-title"
        />
        <span>💻</span>
      </div>
      <p>Welcome to the LightScript development environment. This workspace allows you to create, test, and refine RGB lighting effects for the SignalRGB platform.</p>
      
      <div className="quick-guide">
        <strong>Quick Guide:</strong>
        <ul>
          <li>⚡ Left panel: Effect selector, stats, and metadata</li>
          <li>🕹️ Right panel: Interactive controls for your effect</li>
          <li>⌨️ Ctrl+C: Toggle the controls panel visibility</li>
          <li>💾 Screenshot button: Capture your creations</li>
        </ul>
      </div>
      
      <div className="welcome-checkbox">
        <input 
          type="checkbox" 
          id="dontShowAgain" 
          checked={dontShowAgain}
          onChange={(e) => setDontShowAgain((e.target as HTMLInputElement).checked)}
        />
        <label htmlFor="dontShowAgain">Don't show this again</label>
      </div>
      
      <button className="start-button" onClick={handleStart}>
        START BUILDING
      </button>
      
      <div className="welcome-footer">
        <span className="creator-label">Created by</span>
        <SparklingName
          name="@hyperb1iss"
          sparkleCount={15}
          gradient={true}
          className="creator-name"
          href="https://hyperbliss.tech"
        />
        <a 
          href="https://github.com/hyperb1iss" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="github-link" 
          title="Check out my GitHub"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
          </svg>
        </a>
      </div>
    </div>
  );
}; 