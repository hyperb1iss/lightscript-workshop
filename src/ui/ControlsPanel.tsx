import { h, FunctionComponent } from 'preact';
import { ControlDefinition, ControlValues } from '../common/definitions';
import { useState, useRef, useEffect } from 'preact/hooks';
import { debug } from '../common/debug';

interface ControlsPanelProps {
  controlDefinitions: ControlDefinition[];
  controlValues: ControlValues;
  onControlChange: (id: string, value: unknown) => void;
  onResetControls: () => void;
}

export const ControlsPanel: FunctionComponent<ControlsPanelProps> = ({
  controlDefinitions,
  controlValues,
  onControlChange,
  onResetControls
}) => {
  return (
    <div className="controls-panel">
      <div className="controls-header">
        <h3>🕹️ Controls</h3>
        <div className="controls-actions">
          <button 
            className="reset-button" 
            onClick={onResetControls}
            title="Reset all controls to default values"
          >
            ↺ Reset
          </button>
        </div>
      </div>
      
      <div className="controls-container">
        {controlDefinitions.length === 0 ? (
          <div className="no-controls-message">
            No controls available for this effect ⚡
          </div>
        ) : (
          controlDefinitions.map(def => (
            <ControlItem 
              key={def.id}
              definition={def}
              value={controlValues[def.id] ?? def.default}
              onChange={onControlChange}
            />
          ))
        )}
      </div>
    </div>
  );
};

interface ControlItemProps {
  definition: ControlDefinition;
  value: unknown;
  onChange: (id: string, value: unknown) => void;
}

const ControlItem: FunctionComponent<ControlItemProps> = ({ 
  definition, 
  value, 
  onChange 
}) => {
  const { id, type, label, tooltip } = definition;
  
  // Get appropriate emoji for control type
  const getControlEmoji = () => {
    switch(type) {
      case 'number': return '⚡';
      case 'boolean': return '🧠';
      case 'combobox': return '🌐';
      default: return '💻';
    }
  };
  
  const renderControl = () => {
    switch (type) {
      case 'number':
        return (
          <div className="number-control">
            <div className="control-header">
              <label title={tooltip}>
                <span className="control-emoji">{getControlEmoji()}</span> {label}
              </label>
              <span className="control-value">{String(value)}</span>
            </div>
            <input
              type="range"
              min={(definition as ControlDefinition & {min?: number}).min ?? 0}
              max={(definition as ControlDefinition & {max?: number}).max ?? 100}
              step={(definition as ControlDefinition & {step?: number}).step ?? 1}
              value={Number(value)}
              onInput={(e) => {
                const newValue = parseFloat((e.target as HTMLInputElement).value);
                debug('info', `Slider adjusting: ${id}`, newValue);
                onChange(id, newValue);
              }}
              onChange={(e) => {
                const newValue = parseFloat((e.target as HTMLInputElement).value);
                debug('success', `Slider set to: ${id}`, newValue);
                onChange(id, newValue);
              }}
            />
          </div>
        );
        
      case 'boolean':
        return (
          <div className="boolean-control">
            <div className="control-header">
              <label title={tooltip}>
                <span className="control-emoji">{getControlEmoji()}</span> {label}
              </label>
              <input
                type="checkbox"
                checked={value === true || value === 1}
                onChange={(e) => {
                  const newValue = (e.target as HTMLInputElement).checked ? 1 : 0;
                  debug('success', `Toggle changed: ${id}`, newValue ? 'ON' : 'OFF');
                  onChange(id, newValue);
                }}
              />
            </div>
          </div>
        );
        
      case 'combobox':
        return (
          <div className="combobox-control">
            <label title={tooltip}>
              <span className="control-emoji">{getControlEmoji()}</span> {label}
            </label>
            <CyberDropdown 
              id={id}
              options={((definition as ControlDefinition & {values?: string[]}).values as string[])}
              value={String(value)}
              onChange={(newValue) => {
                debug('success', `Dropdown selected: ${id}`, newValue);
                onChange(id, newValue);
              }}
            />
          </div>
        );
        
      default:
        return <div>Unsupported control type: {type}</div>;
    }
  };
  
  return (
    <div className="control-item">
      {renderControl()}
    </div>
  );
};

interface CyberDropdownProps {
  id: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}

const CyberDropdown: FunctionComponent<CyberDropdownProps> = ({
  id: _id,
  options,
  value,
  onChange
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [flipDirection, setFlipDirection] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLDivElement>(null);
  
  // Check if we need to flip the dropdown direction
  useEffect(() => {
    if (isOpen && dropdownRef.current && selectedRef.current) {
      const dropdownRect = selectedRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const spaceBelow = windowHeight - dropdownRect.bottom;
      
      // If there's not enough space below and more space above, flip it
      if (spaceBelow < 200 && dropdownRect.top > 200) {
        setFlipDirection(true);
      } else {
        setFlipDirection(false);
      }
    }
  }, [isOpen]);
  
  // Close the dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  const handleSelect = (option: string) => {
    onChange(option);
    setIsOpen(false);
  };
  
  const dropdownPosition = flipDirection ? 'flip' : '';
  
  return (
    <div className="cyber-dropdown" ref={dropdownRef}>
      <div 
        className="cyber-dropdown-selected" 
        onClick={() => setIsOpen(!isOpen)}
        ref={selectedRef}
      >
        <span>{value}</span>
        <span className="cyber-dropdown-arrow">{isOpen ? (flipDirection ? '▼' : '▲') : '▼'}</span>
      </div>
      
      <div className={`cyber-dropdown-options ${isOpen ? 'open' : ''} ${dropdownPosition}`}>
        {options.map(option => (
          <div 
            key={option} 
            className={`cyber-dropdown-option ${option === value ? 'selected' : ''}`}
            onClick={() => handleSelect(option)}
          >
            {option}
          </div>
        ))}
      </div>
    </div>
  );
}; 