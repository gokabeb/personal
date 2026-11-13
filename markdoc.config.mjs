import { defineMarkdocConfig, component, nodes } from '@astrojs/markdoc/config';

export default defineMarkdocConfig({
  nodes: {
    link: { ...nodes.link, render: component('./src/components/LetterLink.astro') },
  },
});
