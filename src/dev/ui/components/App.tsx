import { FunctionComponent } from 'preact'
import { useEffect, useState } from 'preact/hooks'
import { ControlDefinition, ControlValues } from '../../../core/controls/definitions'
import { ControlsPanel } from './ControlsPanel'
import { EffectsPanel } from './EffectsPanel'
import { Loader } from './Loader'
import { Notification } from './Notification'
import { WelcomeModal } from './WelcomeModal'

interface AppProps {
    effects: Array<{
        id: string
        name?: string
        description?: string
        author?: string
    }>
    currentEffectId: string
    fps: number
    controlDefinitions: ControlDefinition[]
    controlValues: ControlValues
    isLoading: boolean
    onEffectChange: (effectId: string) => void
    onControlChange: (id: string, value: unknown) => void
    onResetControls: () => void
    onSavePreview: () => void
}

// Make the showNotification function available globally
// This allows other code to trigger notifications
let showNotification: (message: string, isError?: boolean) => void

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
    onSavePreview,
}) => {
    const [notification, setNotification] = useState<{ message: string; isError: boolean } | null>(null)
    const [showWelcomeModal, setShowWelcomeModal] = useState(() => {
        // Check if user has previously chosen to hide the welcome screen
        return localStorage.getItem('hideWelcomeScreen') !== 'true'
    })

    // Local loading state that we can control with a timer
    const [showLoader, setShowLoader] = useState(isLoading)
    const [docsWindow, setDocsWindow] = useState<Window | null>(null)

    // Set up the global notification function
    useEffect(() => {
        showNotification = (message: string, isError = false) => {
            setNotification({ isError, message })

            // Auto-dismiss after 3 seconds
            setTimeout(() => {
                setNotification(null)
            }, 3000)
        }

        // Make it available globally
        window.showNotification = showNotification

        return () => {
            // Assign a noop function instead of deleting to avoid TypeScript error
            window.showNotification = () => {}
        }
    }, [])

    // Handle loading state with maximum time limit
    useEffect(() => {
        if (isLoading) {
            setShowLoader(true)

            // Force hide loader after 0.5 seconds max
            const timer = setTimeout(() => {
                setShowLoader(false)
            }, 500)

            return () => clearTimeout(timer)
        }
        setShowLoader(false)
    }, [isLoading])

    // Set control count in a global variable for UI display purposes
    useEffect(() => {
        window.controlsCount = controlDefinitions.length
    }, [controlDefinitions])

    const handleWelcomeClose = () => {
        setShowWelcomeModal(false)
    }

    return (
        <div className="dev-engine-container">
            {showLoader && <Loader />}

            {showWelcomeModal && <WelcomeModal onClose={handleWelcomeClose} />}

            <EffectsPanel
                currentEffectId={currentEffectId}
                effects={effects}
                fps={fps}
                onEffectChange={onEffectChange}
                onOpenDocs={() => {
                    // Close existing window if open
                    if (docsWindow && !docsWindow.closed) {
                        docsWindow.focus()
                        return
                    }

                    // Open new window
                    const width = 800
                    const height = 600
                    const left = window.screenX + (window.outerWidth - width) / 2
                    const top = window.screenY + (window.outerHeight - height) / 2

                    const newWindow = window.open(
                        '',
                        'lightscript-docs',
                        `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`,
                    )

                    if (newWindow) {
                        setDocsWindow(newWindow)

                        // Set up the window content
                        newWindow.document.title = '📚 LightScript Documentation'
                        newWindow.document.body.innerHTML = '<div id="docs-root"></div>'

                        // Copy styles to new window
                        const styles = document.querySelectorAll('link[rel="stylesheet"], style')
                        styles.forEach((style) => {
                            newWindow.document.head.appendChild(style.cloneNode(true))
                        })

                        // Add custom styles for standalone window
                        const customStyle = newWindow.document.createElement('style')
                        customStyle.textContent = `
                            body {
                                margin: 0;
                                padding: 0;
                                background: linear-gradient(180deg, rgb(10, 10, 18) 0%, rgb(15, 15, 28) 100%);
                                height: 100vh;
                                overflow: hidden;
                            }
                            #docs-root {
                                height: 100vh;
                                display: flex;
                                flex-direction: column;
                            }
                            .docs-window {
                                height: 100%;
                                display: flex;
                                flex-direction: column;
                            }
                            .docs-window-header {
                                padding: 15px 20px;
                                background: rgba(12, 12, 26, 0.95);
                                border-bottom: 1px solid rgba(1, 205, 254, 0.25);
                                display: flex;
                                align-items: center;
                                justify-content: space-between;
                                flex-shrink: 0;
                            }
                            .docs-window-header h2 {
                                margin: 0;
                                color: #FF71CE;
                                font-family: "Rajdhani", sans-serif;
                                font-size: 1.5rem;
                                text-shadow: 0 0 10px rgba(255, 113, 206, 0.5);
                            }
                            .docs-window-body {
                                flex: 1;
                                overflow-y: auto;
                                overflow-x: hidden;
                                padding: 20px;
                                min-height: 0;
                            }
                            /* Ensure docs browser content is scrollable */
                            .docs-browser {
                                height: 100%;
                            }
                            /* Docs panel styling */
                            .docs-panel {
                                height: 100%;
                                display: flex;
                                flex-direction: column;
                            }
                            .docs-content {
                                flex: 1;
                                overflow-y: auto;
                                padding: 0 20px 20px 20px;
                                line-height: 1.6;
                            }
                            /* Remove double spacing */
                            .docs-content p {
                                margin: 0.8em 0;
                            }
                            .docs-content h1, 
                            .docs-content h2, 
                            .docs-content h3 {
                                margin-top: 1.2em;
                                margin-bottom: 0.6em;
                            }
                            /* Code block styling */
                            .md-code {
                                background: rgba(10, 10, 20, 0.8);
                                border: 1px solid rgba(1, 205, 254, 0.3);
                                border-radius: 6px;
                                padding: 16px;
                                margin: 1em 0;
                                overflow-x: auto;
                                font-family: 'Fira Code', 'Consolas', monospace;
                                font-size: 0.9em;
                                line-height: 1.5;
                                box-shadow: 0 0 20px rgba(1, 205, 254, 0.15);
                            }
                            .md-code code {
                                color: #01CDFE;
                                background: none;
                                padding: 0;
                                font-size: inherit;
                                text-shadow: 0 0 3px rgba(1, 205, 254, 0.3);
                            }
                            /* Inline code styling */
                            .md-inline-code {
                                background: rgba(255, 113, 206, 0.15);
                                color: #FF71CE;
                                padding: 2px 6px;
                                border-radius: 3px;
                                font-family: 'Fira Code', 'Consolas', monospace;
                                font-size: 0.9em;
                                border: 1px solid rgba(255, 113, 206, 0.3);
                            }
                            /* Custom scrollbar styles */
                            .docs-window-body::-webkit-scrollbar {
                                width: 12px;
                            }
                            .docs-window-body::-webkit-scrollbar-track {
                                background: rgba(12, 12, 26, 0.5);
                                border-radius: 6px;
                            }
                            .docs-window-body::-webkit-scrollbar-thumb {
                                background: linear-gradient(180deg, #01CDFE, #FF71CE);
                                border-radius: 6px;
                                border: 2px solid rgba(12, 12, 26, 0.5);
                            }
                            .docs-window-body::-webkit-scrollbar-thumb:hover {
                                background: linear-gradient(180deg, #FF71CE, #01CDFE);
                            }
                        `
                        newWindow.document.head.appendChild(customStyle)

                        // Render docs browser in new window
                        import('preact').then(({ render }) => {
                            import('./DocsBrowser').then(({ DocsBrowser }) => {
                                const root = newWindow.document.getElementById('docs-root')
                                if (root) {
                                    render(
                                        <div className="docs-window">
                                            <div className="docs-window-header">
                                                <h2>📚 Documentation</h2>
                                            </div>
                                            <div className="docs-window-body">
                                                <DocsBrowser />
                                            </div>
                                        </div>,
                                        root,
                                    )
                                }
                            })
                        })

                        // Clean up reference when window closes
                        newWindow.addEventListener('beforeunload', () => {
                            setDocsWindow(null)
                        })
                    }
                }}
                onSavePreview={onSavePreview}
            />

            <ControlsPanel
                controlDefinitions={controlDefinitions}
                controlValues={controlValues}
                onControlChange={onControlChange}
                onResetControls={onResetControls}
            />

            {notification && (
                <Notification
                    isError={notification.isError}
                    message={notification.message}
                    onClose={() => setNotification(null)}
                />
            )}
        </div>
    )
}

// Export the showNotification function for use in other modules
export { showNotification }
