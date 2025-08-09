import { FunctionComponent, h } from 'preact'

interface LoaderProps {
    message?: string
}

export const Loader: FunctionComponent<LoaderProps> = ({ message = 'LOADING LIGHTSCRIPT' }) => {
    return (
        <div className="loader">
            <div className="loader-text">{message}</div>
            <div className="spinner" />
        </div>
    )
}
