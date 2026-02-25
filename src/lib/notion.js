// Notion client — scaffolded. Uncomment when NOTION_API_KEY is configured.
//
// import { Client } from '@notionhq/client';
//
// const notion = new Client({
//   auth: import.meta.env.NOTION_API_KEY,
// });
//
// /**
//  * Fetch all entries from the Notion commonplace database.
//  * @returns {Promise<Array>} - Array of formatted commonplace entries
//  */
// export async function fetchCommonplaceEntries() {
//   const response = await notion.databases.query({
//     database_id: import.meta.env.NOTION_DATABASE_ID,
//     sorts: [{ property: 'Created', direction: 'descending' }],
//   });
//
//   return response.results.map(page => ({
//     id: page.id,
//     quote: page.properties.Quote?.rich_text[0]?.text.content ?? '',
//     sourceAuthor: page.properties.Author?.rich_text[0]?.text.content ?? '',
//     sourceWork: page.properties.Work?.rich_text[0]?.text.content ?? '',
//     sourceYear: page.properties.Year?.number ?? null,
//     annotation: page.properties.Annotation?.rich_text[0]?.text.content ?? '',
//     tags: page.properties.Tags?.multi_select.map(t => t.name) ?? [],
//   }));
// }
//
// /**
//  * Fetch project updates from a Notion database.
//  * @param {string} projectSlug
//  * @returns {Promise<Array>}
//  */
// export async function fetchProjectUpdates(projectSlug) {
//   const response = await notion.databases.query({
//     database_id: import.meta.env.NOTION_DATABASE_ID,
//     filter: {
//       property: 'Project',
//       rich_text: { equals: projectSlug },
//     },
//     sorts: [{ property: 'Date', direction: 'descending' }],
//   });
//
//   return response.results.map(page => ({
//     date: page.properties.Date?.date.start ?? '',
//     text: page.properties.Update?.rich_text[0]?.text.content ?? '',
//   }));
// }

export const fetchCommonplaceEntries = null; // Replace with actual function when API key is set
export const fetchProjectUpdates = null; // Replace with actual function when API key is set
