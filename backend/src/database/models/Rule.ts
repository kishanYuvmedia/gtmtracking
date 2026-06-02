import { query } from '../index';

export interface RuleRow {
  id: string;
  website_id: string;
  rule_name: string;
  conditions: Record<string, unknown>;
  actions: Record<string, unknown>;
  status: string;
  created_at?: Date;
}

export async function getRulesByWebsite(websiteId: string) {
  const result = await query(
    'SELECT * FROM rules WHERE website_id = $1 AND status = $2 ORDER BY created_at DESC',
    [websiteId, 'active']
  );
  return result.rows;
}

export async function createRule(rule: Omit<RuleRow, 'created_at'>) {
  const result = await query(
    `INSERT INTO rules (id, website_id, rule_name, conditions, actions, status)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [rule.id, rule.website_id, rule.rule_name, JSON.stringify(rule.conditions), JSON.stringify(rule.actions), rule.status]
  );
  return result.rows[0];
}
