// OpenAI embeddings — scaffolded. Uncomment when OPENAI_API_KEY is configured.
//
// import OpenAI from 'openai';
//
// const openai = new OpenAI({
//   apiKey: import.meta.env.OPENAI_API_KEY,
// });
//
// /**
//  * Generate a text embedding using text-embedding-3-small.
//  * @param {string} text - The text to embed
//  * @returns {Promise<number[]>} - 1536-dimensional embedding vector
//  */
// export async function generateEmbedding(text) {
//   const response = await openai.embeddings.create({
//     model: 'text-embedding-3-small',
//     input: text,
//   });
//   return response.data[0].embedding;
// }
//
// /**
//  * Compute cosine similarity between two embedding vectors.
//  * @param {number[]} a
//  * @param {number[]} b
//  * @returns {number} - Similarity score between -1 and 1
//  */
// export function cosineSimilarity(a, b) {
//   const dot = a.reduce((sum, ai, i) => sum + ai * b[i], 0);
//   const magA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0));
//   const magB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0));
//   return dot / (magA * magB);
// }
//
// /**
//  * Batch embed all commonplace entries and upsert to Supabase.
//  * Run once to populate the database.
//  */
// export async function seedEmbeddings(entries, supabaseClient) {
//   for (const entry of entries) {
//     const embedding = await generateEmbedding(entry.quote + ' ' + entry.annotation);
//     await supabaseClient
//       .from('commonplace_entries')
//       .upsert({ ...entry, embedding });
//   }
// }

export const generateEmbedding = null; // Replace with actual function when API key is set
