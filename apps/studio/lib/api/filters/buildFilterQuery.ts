import { SupabaseClient } from '@supabase/supabase-js'

interface FilterCondition {
  column: string
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'in' | 'is'
  value: unknown
}

interface FilterGroup {
  conjunction: 'AND' | 'OR'
  conditions: FilterCondition[]
}

const OPERATOR_MAP: Record<string, string> = {
  eq: '=',
  neq: '!=',
  gt: '>',
  gte: '>=',
  lt: '<',
  lte: '<=',
  like: 'LIKE',
  ilike: 'ILIKE',
  in: 'IN',
  is: 'IS'
}

export async function buildFilterQuery(
  supabase: SupabaseClient,
  tableName: string,
  schema: string,
  filterGroups: FilterGroup[],
  selectColumns: string[] = ['*']
): Promise<{ data: unknown[]; error: Error | null }> {
  const params: unknown[] = []
  let paramIndex = 1

  const buildCondition = (condition: FilterCondition): string => {
    const sqlOperator = OPERATOR_MAP[condition.operator]

    if (condition.operator === 'is') {
      return `"${condition.column}" ${sqlOperator} ${condition.value === null ? 'NULL' : 'NOT NULL'}`
    }

    if (condition.operator === 'in' && Array.isArray(condition.value)) {
      const placeholders = condition.value.map(() => `$${paramIndex++}`).join(', ')
      params.push(...condition.value)
      return `"${condition.column}" ${sqlOperator} (${placeholders})`
    }

    params.push(condition.value)
    return `"${condition.column}" ${sqlOperator} $${paramIndex++}`
  }

  const buildGroup = (group: FilterGroup): string => {
    const conditions = group.conditions.map(buildCondition)
    return `(${conditions.join(` ${group.conjunction} `)})`
  }

  const whereClause = filterGroups.length > 0
    ? `WHERE ${filterGroups.map(buildGroup).join(' AND ')}`
    : ''

  const columnsStr = selectColumns.join(', ')
  const query = `SELECT ${columnsStr} FROM "${schema}"."${tableName}" ${whereClause} LIMIT 1000`

  try {
    const { data, error } = await supabase.rpc('execute_sql', {
      query_text: query,
      query_params: params
    })

    if (error) throw error
    return { data: data || [], error: null }
  } catch (err) {
    return { data: [], error: err as Error }
  }
}
