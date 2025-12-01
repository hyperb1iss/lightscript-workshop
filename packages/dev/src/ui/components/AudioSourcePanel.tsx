/**
 * Audio Source Panel
 *
 * UI for selecting and controlling audio input in the dev studio
 */

import { FunctionComponent } from 'preact'
import { useCallback, useEffect, useState } from 'preact/hooks'
import { AudioSourceType, DevAudioAnalyzer, getAudioAnalyzer } from '../../audio/audio-analyzer'

interface AudioSourcePanelProps {
    /** Whether the current effect is audio-reactive */
    isAudioReactive?: boolean
    onNotification?: (message: string, isError?: boolean) => void
}

export const AudioSourcePanel: FunctionComponent<AudioSourcePanelProps> = ({ onNotification }) => {
    const [currentSource, setCurrentSource] = useState<AudioSourceType>('none')
    const [isLoading, setIsLoading] = useState(false)
    const [audioLevel, setAudioLevel] = useState(-100)
    const [error, setError] = useState<string | null>(null)
    const [gain, setGain] = useState(1.0)
    const [smoothing, setSmoothing] = useState(0.7)

    const analyzer = getAudioAnalyzer()

    // Initialize state from analyzer - sync with actual audio state
    useEffect(() => {
        setGain(analyzer.getGain())
        setSmoothing(analyzer.getSmoothing())
        // Sync with actual analyzer source (may have been auto-restored)
        setCurrentSource(analyzer.getSource())
    }, [analyzer])

    // Update audio level display and sync source state
    useEffect(() => {
        let animationId: number

        const updateLevel = () => {
            // Sync source state with analyzer (handles auto-restore race condition)
            const actualSource = analyzer.getSource()
            if (actualSource !== currentSource) {
                setCurrentSource(actualSource)
            }

            if (actualSource !== 'none') {
                const data = analyzer.getAudioData()
                setAudioLevel(data.level)
            }
            animationId = requestAnimationFrame(updateLevel)
        }

        updateLevel()
        return () => cancelAnimationFrame(animationId)
    }, [analyzer, currentSource])

    const handleSourceChange = useCallback(
        async (source: AudioSourceType) => {
            setIsLoading(true)
            setError(null)

            try {
                if (source === 'none') {
                    await analyzer.stop()
                    setCurrentSource('none')
                    onNotification?.('Audio input stopped')
                } else if (source === 'microphone') {
                    await analyzer.startMicrophone()
                    setCurrentSource('microphone')
                    onNotification?.('Microphone active')
                } else if (source === 'system') {
                    await analyzer.startSystemAudio()
                    setCurrentSource('system')
                    onNotification?.('System audio active')
                }
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Failed to start audio'
                setError(message)
                onNotification?.(message, true)
                setCurrentSource('none')
            } finally {
                setIsLoading(false)
            }
        },
        [analyzer, onNotification],
    )

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            analyzer.stop()
        }
    }, [analyzer])

    // Convert dB to percentage for meter display
    const levelPercent = Math.max(0, Math.min(100, ((audioLevel + 100) / 100) * 100))

    const isAvailable = DevAudioAnalyzer.isAvailable()
    const isSystemAvailable = DevAudioAnalyzer.isSystemAudioAvailable()

    return (
        <div className="audio-source-panel">
            <div className="panel-header">
                <span className="panel-icon">🎵</span>
                <span className="panel-title">Audio Input</span>
            </div>

            {!isAvailable ? (
                <div className="audio-unavailable">Audio capture not available in this browser</div>
            ) : (
                <>
                    <div className="audio-source-buttons">
                        <button
                            className={`audio-btn ${currentSource === 'none' ? 'active' : ''}`}
                            disabled={isLoading}
                            onClick={() => handleSourceChange('none')}
                            title="No audio input"
                            type="button"
                        >
                            🔇 Off
                        </button>

                        <button
                            className={`audio-btn ${currentSource === 'microphone' ? 'active' : ''}`}
                            disabled={isLoading}
                            onClick={() => handleSourceChange('microphone')}
                            title="Use microphone input"
                            type="button"
                        >
                            🎤 Mic
                        </button>

                        <button
                            className={`audio-btn ${currentSource === 'system' ? 'active' : ''}`}
                            disabled={isLoading || !isSystemAvailable}
                            onClick={() => handleSourceChange('system')}
                            title={
                                isSystemAvailable
                                    ? 'Share a browser tab with audio'
                                    : 'System audio not available in this browser'
                            }
                            type="button"
                        >
                            🔊 System
                        </button>
                    </div>

                    {currentSource !== 'none' && (
                        <div className="audio-meter-container">
                            <div className="audio-meter">
                                <div className="audio-meter-fill" style={{ width: `${levelPercent}%` }} />
                            </div>
                            <span className="audio-level-value">{audioLevel.toFixed(0)} dB</span>
                        </div>
                    )}

                    {currentSource !== 'none' && (
                        <div className="audio-controls">
                            <div className="audio-control-item">
                                <div className="audio-control-label">
                                    <span>Gain</span>
                                    <span className="audio-control-value">{Math.round(gain * 100)}%</span>
                                </div>
                                <input
                                    aria-label="Gain"
                                    className="audio-slider"
                                    max="3"
                                    min="0"
                                    onChange={(e: Event) => {
                                        const val = Number((e.target as HTMLInputElement).value)
                                        setGain(val)
                                        analyzer.setGain(val)
                                    }}
                                    step="0.1"
                                    type="range"
                                    value={gain}
                                />
                            </div>
                            <div className="audio-control-item">
                                <div className="audio-control-label">
                                    <span>Smoothing</span>
                                    <span className="audio-control-value">{Math.round(smoothing * 100)}%</span>
                                </div>
                                <input
                                    aria-label="Smoothing"
                                    className="audio-slider"
                                    max="0.95"
                                    min="0"
                                    onChange={(e: Event) => {
                                        const val = Number((e.target as HTMLInputElement).value)
                                        setSmoothing(val)
                                        analyzer.setSmoothing(val)
                                    }}
                                    step="0.05"
                                    type="range"
                                    value={smoothing}
                                />
                            </div>
                        </div>
                    )}

                    {error && <div className="audio-error">{error}</div>}

                    {isLoading && <div className="audio-loading">Starting audio...</div>}
                </>
            )}
        </div>
    )
}

// Don't render at all if effect doesn't use audio
export const ConditionalAudioSourcePanel: FunctionComponent<AudioSourcePanelProps> = (props) => {
    if (!props.isAudioReactive) {
        return null
    }
    return <AudioSourcePanel {...props} />
}
