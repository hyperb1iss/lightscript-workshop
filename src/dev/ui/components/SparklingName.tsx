import { FunctionComponent, h } from 'preact'
import { useEffect, useState } from 'preact/hooks'

// CSS import is now handled in the ui/index.ts file

interface SparkleType {
    id: number
    size: number
    top: number
    left: number
    delay: number
}

interface SparklingNameProps {
    name: string
    sparkleCount?: number
    className?: string
    color?: string
    gradient?: boolean
    href?: string
    onClick?: () => void
}

// Custom type for handling CSS variables
type CSSPropertiesWithCustomVars = {
    '--spark-color': string
} & h.JSX.CSSProperties

const createSparkles = (count: number): SparkleType[] =>
    Array.from({ length: count }, (_, i) => ({
        delay: Math.random() * 1.5,
        id: i,
        left: Math.random() * 100,
        size: Math.random() * 4 + 2,
        top: Math.random() * 100,
    }))

export const SparklingName: FunctionComponent<SparklingNameProps> = ({
    name,
    sparkleCount = 10,
    className = '',
    color = 'var(--neon-pink)',
    gradient = false,
    href,
    onClick,
}) => {
    const [sparkles, setSparkles] = useState<SparkleType[]>([])
    const [isHovered, setIsHovered] = useState(false)

    useEffect(() => {
        const sparklesArray = createSparkles(sparkleCount)
        setSparkles(sparklesArray)
    }, [sparkleCount])

    const handleClick = (e: MouseEvent) => {
        if (onClick) {
            e.preventDefault()
            onClick()
        }
    }

    const content = (
        <span
            className={`highlighted-name ${isHovered ? 'hovered' : ''} ${gradient ? 'gradient-text' : ''}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {name}
        </span>
    )

    return (
        <span
            className={`sparkle-wrapper ${className}`}
            style={{ '--spark-color': color } as CSSPropertiesWithCustomVars}
        >
            {href ? (
                <a className="sparkle-link" href={href} onClick={handleClick} rel="noopener noreferrer" target="_blank">
                    {content}
                </a>
            ) : (
                content
            )}
            {sparkles.map((sparkle) => (
                <span
                    className="sparkle"
                    key={sparkle.id}
                    style={{
                        animationDelay: `${sparkle.delay}s`,
                        height: `${sparkle.size}px`,
                        left: `${sparkle.left}%`,
                        top: `${sparkle.top}%`,
                        width: `${sparkle.size}px`,
                    }}
                />
            ))}
        </span>
    )
}

export default SparklingName
