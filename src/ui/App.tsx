import { h, FunctionComponent } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { ControlDefinition, ControlValues } from '../common/definitions';
import { ControlsPanel } from './ControlsPanel';
import { EffectsPanel } from './EffectsPanel';
import { Notification } from './Notification';
import { WelcomeModal } from './WelcomeModal';
import { Loader } from './Loader';

interface AppProps {
  effects: Array<{
    id: string;
    entry: string;
    name?: string;
    description?: string;
    author?: string;
  }>;
  currentEffectId: string;
  fps: number;
  controlDefinitions: ControlDefinition[];
  controlValues: ControlValues;
  isLoading: boolean;
  onEffectChange: (effectId: string) => void;
  onControlChange: (id: string, value: unknown) => void;
  onResetControls: () => void;
  onTakeScreenshot: () => void;
}

// Make the showNotification function available globally
// This allows other code to trigger notifications
let showNotification: (message: string, isError?: boolean) => void;

export const App: FunctionComponent<AppProps> = ({
  effects,
  currentEffectId,
  fps,
  controlDefinitions,
  controlValues,
  isLoading,
  onEffectChange,
  onControlChange,
  onResetControls,
  onTakeScreenshot
}) => {
  const [notification, setNotification] = useState<{message: string, isError: boolean} | null>(null);
  const [showWelcomeModal, setShowWelcomeModal] = useState(() => {
    // Check if user has previously chosen to hide the welcome screen
    return localStorage.getItem('hideWelcomeScreen') !== 'true';
  });
  
  // Local loading state that we can control with a timer
  const [showLoader, setShowLoader] = useState(isLoading);
  
  // Set up the global notification function
  useEffect(() => {
    showNotification = (message: string, isError: boolean = false) => {
      setNotification({ message, isError });
      
      // Auto-dismiss after 3 seconds
      setTimeout(() => {
        setNotification(null);
      }, 3000);
    };
    
    // Make it available globally
    window.showNotification = showNotification;
    
    return () => {
      // Assign a noop function instead of deleting to avoid TypeScript error
      window.showNotification = () => {};
    };
  }, []);
  
  // Handle loading state with maximum time limit
  useEffect(() => {
    if (isLoading) {
      setShowLoader(true);
      
      // Force hide loader after 0.5 seconds max
      const timer = setTimeout(() => {
        setShowLoader(false);
      }, 500);
      
      return () => clearTimeout(timer);
    } else {
      setShowLoader(false);
    }
  }, [isLoading]);
  
  // Set control count in a global variable for UI display purposes
  useEffect(() => {
    window.controlsCount = controlDefinitions.length;
  }, [controlDefinitions]);
  
  const handleWelcomeClose = () => {
    setShowWelcomeModal(false);
  };
  
  return (
    <div className="dev-engine-container">
      {showLoader && <Loader />}
      
      {showWelcomeModal && <WelcomeModal onClose={handleWelcomeClose} />}
      
      <EffectsPanel
        effects={effects}
        currentEffectId={currentEffectId}
        fps={fps}
        onEffectChange={onEffectChange}
        onTakeScreenshot={onTakeScreenshot}
      />
      
      <ControlsPanel
        controlDefinitions={controlDefinitions}
        controlValues={controlValues}
        onControlChange={onControlChange}
        onResetControls={onResetControls}
      />
      
      {notification && (
        <Notification
          message={notification.message}
          isError={notification.isError}
          onClose={() => setNotification(null)}
        />
      )}
    </div>
  );
};

// Export the showNotification function for use in other modules
export { showNotification }; 