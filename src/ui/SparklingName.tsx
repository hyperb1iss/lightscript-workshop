/** @jsx h */
import { h, FunctionComponent } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import './sparklingName.css';

interface SparkleType {
  id: number;
  size: number;
  top: number;
  left: number;
  delay: number;
}

interface SparklingNameProps {
  name: string;
  sparkleCount?: number;
  className?: string;
  color?: string;
  gradient?: boolean;
  href?: string;
  onClick?: () => void;
}

// Custom type for handling CSS variables
type CSSPropertiesWithCustomVars = {
  '--spark-color': string;
} & h.JSX.CSSProperties;

const createSparkles = (count: number): SparkleType[] =>
  Array.from({ length: count }, (_, i) => ({
    id: i,
    size: Math.random() * 4 + 2,
    top: Math.random() * 100,
    left: Math.random() * 100,
    delay: Math.random() * 1.5,
  }));

export const SparklingName: FunctionComponent<SparklingNameProps> = ({
  name,
  sparkleCount = 10,
  className = '',
  color = 'var(--neon-pink)',
  gradient = false,
  href,
  onClick
}) => {
  const [sparkles, setSparkles] = useState<SparkleType[]>([]);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const sparklesArray = createSparkles(sparkleCount);
    setSparkles(sparklesArray);
  }, [sparkleCount]);

  const handleClick = (e: MouseEvent) => {
    if (onClick) {
      e.preventDefault();
      onClick();
    }
  };

  const content = (
    <span 
      className={`highlighted-name ${isHovered ? 'hovered' : ''} ${gradient ? 'gradient-text' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {name}
    </span>
  );

  return (
    <span 
      className={`sparkle-wrapper ${className}`}
      style={{ '--spark-color': color } as CSSPropertiesWithCustomVars}
    >
      {href ? (
        <a 
          href={href} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="sparkle-link"
          onClick={handleClick}
        >
          {content}
        </a>
      ) : (
        content
      )}
      {sparkles.map((sparkle) => (
        <span
          key={sparkle.id}
          className="sparkle"
          style={{
            width: `${sparkle.size}px`,
            height: `${sparkle.size}px`,
            top: `${sparkle.top}%`,
            left: `${sparkle.left}%`,
            animationDelay: `${sparkle.delay}s`
          }}
        />
      ))}
    </span>
  );
};

export default SparklingName; 