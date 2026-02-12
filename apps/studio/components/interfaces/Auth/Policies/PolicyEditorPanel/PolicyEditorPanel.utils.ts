import type { PostgresPolicy } from '@supabase/postgres-meta'
import { isEqual } from 'lodash'

// [Joshen] Not used but keeping this for now in case we do an inline editor
export const generatePlaceholder = (policy?: PostgresPolicy) => {
  if (policy === undefined) {
    return `
-- Press tab to use this code\n
&nbsp;\n
CREATE POLICY *name* ON *table_name*\n
AS PERMISSIVE -- PERMISSIVE | RESTRICTIVE\n
FOR ALL -- ALL | SELECT | INSERT | UPDATE | DELETE\n
TO *role_name* -- Default: public\n
USING ( *using_expression* )\n
WITH CHECK ( *check_expression* );
`.trim()
  } else {
    let expression = ''
    if (policy.definition !== null && policy.definition !== undefined) {
      expression += `USING ( *${policy.definition}* )${
        policy.check === null || policy.check === undefined ? ';' : ''
      }\n`
    }
    if (policy.check !== null && policy.check !== undefined) {
      expression += `WITH CHECK ( *${policy.check}* );\n`
    }

    return `
-- Press tab to use this code\n
&nbsp;\n
BEGIN;\n
&nbsp;\n
-- To update your policy definition\n
ALTER POLICY "${policy.name}"\n
ON "${policy.schema}"."${policy.table}"\n
TO *${policy.roles.join(', ')}*\n
${expression}
&nbsp;\n
-- To rename your policy\n
ALTER POLICY "${policy.name}"\n
ON "${policy.schema}"."${policy.table}"\n
RENAME TO "*New Policy Name*";\n
&nbsp;\n
COMMIT;
`.trim()
  }
}

export const generateCreatePolicyQuery = ({
  name,
  schema,
  table,
  behavior,
  command,
  roles,
  using,
  check,
}: {
  name: string
  schema: string
  table: string
  behavior: string
  command: string
  roles: string
  using?: string
  check?: string
}) => {
  const querySkeleton = `create policy "${name}" on "${schema}"."${table}" as ${behavior} for ${command} to ${roles}`
  const query =
    command === 'insert'
      ? `${querySkeleton} with check (${check});`
      : `${querySkeleton} using (${using})${(check ?? '').length > 0 ? `with check (${check});` : ';'}`
  return query
}

/**
 * Generate a SQL transaction for applying multiple RLS policies at once.
 * Useful for bulk policy operations like duplicating policies across tables.
 */
export const generateBulkPolicyQuery = (
  policies: Array<{
    name: string
    schema: string
    table: string
    behavior: string
    command: string
    roles: string[]
    using?: string
    check?: string
  }>
) => {
  const statements = policies.map((policy) => {
    const roleList = policy.roles.length > 0 ? policy.roles.join(', ') : 'public'
    const querySkeleton = `create policy "${policy.name}" on "${policy.schema}"."${policy.table}" as ${policy.behavior} for ${policy.command} to ${roleList}`
    return policy.command === 'insert'
      ? `${querySkeleton} with check (${policy.check ?? 'true'});`
      : `${querySkeleton} using (${policy.using ?? 'true'})${(policy.check ?? '').length > 0 ? ` with check (${policy.check});` : ';'}`
  })

  return `BEGIN;\n${statements.join('\n')}\nCOMMIT;`
}

export const checkIfPolicyHasChanged = (
  selectedPolicy: PostgresPolicy,
  policyForm: {
    name: string
    roles: string[]
    check: string | null
    definition: string | null
  }
) => {
  if (selectedPolicy.command === 'INSERT' && selectedPolicy.check !== policyForm.check) {
    return true
  }
  if (
    selectedPolicy.command !== 'INSERT' &&
    (selectedPolicy.definition !== policyForm.definition ||
      selectedPolicy.check !== policyForm.check)
  ) {
    return true
  }
  if (selectedPolicy.name !== policyForm.name) {
    return true
  }
  if (!isEqual(selectedPolicy.roles, policyForm.roles)) {
    return true
  }
  return false
}
