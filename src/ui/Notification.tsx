import { h, FunctionComponent } from 'preact';
import { useEffect, useState } from 'preact/hooks';

interface NotificationProps {
  message: string;
  isError?: boolean;
  duration?: number;
  onClose?: () => void;
}

export const Notification: FunctionComponent<NotificationProps> = ({
  message,
  isError = false,
  duration = 3000,
  onClose
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);
  
  useEffect(() => {
    // Start the exit animation after duration - 500ms
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, duration - 500);
    
    // Remove the notification after duration
    const closeTimer = setTimeout(() => {
      setIsVisible(false);
      if (onClose) onClose();
    }, duration);
    
    return () => {
      clearTimeout(exitTimer);
      clearTimeout(closeTimer);
    };
  }, [duration, onClose]);
  
  if (!isVisible) return null;
  
  const baseClass = `notification ${isError ? 'error' : 'success'} ${isExiting ? 'exiting' : ''}`;
  const emoji = isError ? '🔥' : '⚡';
  
  return (
    <div className={baseClass}>
      <div className="notification-border" />
      {emoji} {message}
    </div>
  );
};

// Styling is in styles.css 