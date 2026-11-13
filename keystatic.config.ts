import { config, collection, singleton, fields } from '@keystatic/core';

// Where edits are saved. On this computer they are plain files. On the live
// site (and during the one-time GitHub setup) the PUBLIC_KEYSTATIC_REPO
// setting switches it to saving into the GitHub repository, which is what
// makes the site rebuild after every save.
const repo = import.meta.env.PUBLIC_KEYSTATIC_REPO as `${string}/${string}` | undefined;
const storage = repo ? ({ kind: 'github', repo } as const) : ({ kind: 'local' } as const);

export default config({
  storage,
  ui: {
    brand: { name: 'Karan\u2019s site' },
    // The menu, in the order a visitor meets things.
    navigation: {
      'Home page': ['letter'],
      'Other pages': ['cv', 'writing', 'now'],
    },
  },
  singletons: {
    letter: singleton({
      label: 'Letter',
      path: 'src/content/letter/index',
      format: { contentField: 'body' },
      entryLayout: 'content',
      schema: {
        body: fields.markdoc({
          label: 'The letter',
          description:
            'Your homepage. To make a doorway, select a phrase and link it to /writing, /cv or /now. Straight quotes turn curly on the site by themselves.',
          options: { image: false, table: false, heading: false, divider: false, codeBlock: false },
          extension: 'mdoc',
        }),
      },
    }),
    now: singleton({
      label: 'Now (notes)',
      path: 'src/content/now',
      format: { data: 'json' },
      schema: {
        notes: fields.array(
          fields.text({ label: 'Note', multiline: true }),
          {
            label: 'Thinking & Learning',
            description: 'A few sentences each. Reading, listening and watching fill themselves in from your accounts.',
            itemLabel: (props) => props.value || 'Note',
          },
        ),
      },
    }),
    cv: singleton({
      label: 'Experience (resume)',
      path: 'src/content/cv',
      format: { data: 'json' },
      schema: {
        intro: fields.text({ label: 'Line under the title', description: 'For example: your city and email.' }),
        resumePdf: fields.file({
          label: 'Resume PDF',
          description: 'Leave out your address and phone number.',
          directory: 'public/files',
          publicPath: '/files/',
        }),
        sections: fields.array(
          fields.object({
            title: fields.text({ label: 'Section title' }),
            items: fields.array(
              fields.object({
                heading: fields.text({ label: 'Role or title' }),
                sub: fields.text({ label: 'Organisation or detail' }),
                dates: fields.text({ label: 'Dates' }),
                description: fields.text({
                  label: 'Description',
                  description: 'Wrap key words in **double asterisks** to make them shimmer.',
                  multiline: true,
                }),
              }),
              { label: 'Entries', itemLabel: (props) => props.fields.heading.value || 'Entry' },
            ),
          }),
          { label: 'Sections', itemLabel: (props) => props.fields.title.value || 'Section' },
        ),
      },
    }),
  },
  collections: {
    writing: collection({
      label: 'Writing',
      path: 'src/content/writing/*',
      slugField: 'title',
      format: { data: 'yaml' },
      columns: ['kind', 'date'],
      schema: {
        title: fields.slug({ name: { label: 'Title' } }),
        date: fields.date({ label: 'Date', validation: { isRequired: true } }),
        kind: fields.select({
          label: 'Kind',
          options: [
            { label: 'Poetry (shows under the Poetry filter)', value: 'poem' },
            { label: 'Essay (shows under Essays)', value: 'essay' },
            { label: 'Commentary, e.g. radio (shows under Essays)', value: 'radio' },
            { label: 'Book', value: 'book' },
            { label: 'Press about me', value: 'press' },
          ],
          defaultValue: 'poem',
        }),
        blurb: fields.text({ label: 'One line about it', description: 'Not shown in the list, but search looks through it.' }),
        published: fields.checkbox({ label: 'Published', description: 'Tick to show it on the site. Unticked pieces stay private drafts.', defaultValue: false }),
        externalUrl: fields.url({ label: 'Link, if it lives somewhere else' }),
        text: fields.text({
          label: 'The piece itself',
          description: 'Line breaks and indents are kept exactly as you type them.',
          multiline: true,
        }),
      },
    }),
  },
});
