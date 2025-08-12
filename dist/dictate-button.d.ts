export interface DictateButtonProps {
    size?: number;
    apiEndpoint?: string;
    language?: string;
    theme?: 'light' | 'dark';
    class?: string;
}
declare module 'solid-js' {
    namespace JSX {
        interface IntrinsicElements {
            'dictate-button': Element & DictateButtonProps;
        }
    }
}
