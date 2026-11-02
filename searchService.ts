import { Client } from '@elastic/elasticsearch';
import { env } from '../config/env';
import { pool } from '../config/db';

let elasticClient: Client | null = null;

if (env.elasticsearchUrl) {
  elasticClient = new Client({
    node: env.elasticsearchUrl,
  });
}

export async function searchEmails(searchTerm: string, status?: string): Promise<any[]> {
  const trimmed = (searchTerm || '').trim();

  if (elasticClient && trimmed) {
    try {
      const response = await elasticClient.search({
        index: 'emails',
        query: {
          bool: {
            must: [
              {
                multi_match: {
                  query: trimmed,
                  fields: ['recipient', 'subject', 'body'],
                  fuzziness: 'auto',
                },
              },
            ],
            filter: status ? [{ term: { status } }] : [],
          },
        },
      });

      return response.hits.hits.map((hit) => hit._source);
    } catch (error) {
      console.warn('Falling back to Postgres search because Elasticsearch is unavailable:', error);
    }
  }

  const sql = `
    SELECT * FROM emails
    WHERE 1 = 1
    ${status ? 'AND status = $1' : ''}
    AND (
      recipient ILIKE $${status ? 2 : 1}
      OR subject ILIKE $${status ? 2 : 1}
      OR body ILIKE $${status ? 2 : 1}
    )
    ORDER BY scheduled_for DESC
    LIMIT 100;
  `;

  const params = status ? [status, `%${trimmed}%`] : [`%${trimmed}%`];
  const result = await pool.query(sql, params);
  return result.rows;
}
