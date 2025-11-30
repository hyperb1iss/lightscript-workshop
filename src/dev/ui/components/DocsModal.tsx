import { FunctionComponent } from 'preact'
import { DocsBrowser } from './DocsBrowser'

interface DocsModalProps {
    onClose: () => void
}

export const DocsModal: FunctionComponent<DocsModalProps> = ({ onClose }) => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose()
    }

    return (
        <div className="docs-modal" onKeyDown={(e: any) => handleKeyDown(e)} role="dialog" tabIndex={-1}>
            <div className="docs-modal-header">
                <h2>📚 Documentation</h2>
                <button
                    aria-label="Close docs"
                    className="docs-close"
                    onClick={onClose}
                    onKeyDown={(e: any) => (e.key === 'Enter' ? onClose() : null)}
                    type="button"
                >
                    ✕
                </button>
            </div>
            <div className="docs-modal-body">
                <DocsBrowser />
            </div>
        </div>
    )
}
