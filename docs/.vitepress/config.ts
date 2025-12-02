import { defineConfig } from 'vitepress'

export default defineConfig({
    base: '/lightscript-workshop/',
    description: 'Modern TypeScript framework for SignalRGB lighting effects',

    head: [
        ['link', { href: '/logo.svg', rel: 'icon', type: 'image/svg+xml' }],
        ['meta', { content: '#e135ff', name: 'theme-color' }],
        ['meta', { content: 'website', property: 'og:type' }],
        ['meta', { content: 'LightScript Workshop', property: 'og:title' }],
        ['meta', { content: 'Modern TypeScript framework for SignalRGB lighting effects', property: 'og:description' }],
    ],

    // Ignore localhost URLs in docs (they're examples, not actual links)
    ignoreDeadLinks: [/^http:\/\/localhost/],

    markdown: {
        theme: {
            dark: 'one-dark-pro',
            light: 'github-light',
        },
    },

    themeConfig: {
        footer: {
            copyright: 'Copyright 2024 Stefanie Jane',
            message: 'Released under the MIT License.',
        },
        logo: '/logo.svg',

        nav: [
            { link: '/getting-started/', text: 'Guide' },
            { link: '/reference/', text: 'Reference' },
            { link: '/examples/', text: 'Examples' },
            { link: '/ai/', text: 'AI' },
            { link: 'https://hyperb1iss.github.io/lightscript-workshop/playground/', text: 'Playground' },
        ],

        search: {
            provider: 'local',
        },

        sidebar: {
            '/ai/': [
                {
                    items: [{ link: '/ai/', text: 'Guide' }],
                    text: 'AI Development',
                },
            ],
            '/examples/': [
                {
                    items: [{ link: '/examples/', text: 'Code Patterns' }],
                    text: 'Examples',
                },
            ],
            '/getting-started/': [
                {
                    items: [
                        { link: '/getting-started/', text: 'Introduction' },
                        { link: '/getting-started/installation', text: 'Installation' },
                        { link: '/getting-started/quick-start', text: 'Quick Start' },
                        { link: '/getting-started/project-structure', text: 'Project Structure' },
                    ],
                    text: 'Getting Started',
                },
            ],
            '/guide/': [
                {
                    items: [{ link: '/guide/', text: 'Overview' }],
                    text: 'Guide',
                },
            ],
            '/reference/': [
                {
                    items: [{ link: '/reference/', text: 'API Reference' }],
                    text: 'Reference',
                },
            ],
        },

        socialLinks: [{ icon: 'github', link: 'https://github.com/hyperb1iss/lightscript-workshop' }],
    },
    title: 'LightScript Workshop',
})
