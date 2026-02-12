import { createClient } from '@supabase/supabase-js'
import { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'

import apiWrapper from 'lib/api/apiWrapper'

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

export default (req: NextApiRequest, res: NextApiResponse) => apiWrapper(req, res, handler)

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req

  switch (method) {
    case 'PATCH':
      return handlePatch(req, res)
    case 'DELETE':
      return handleDelete(req, res)
    default:
      res.setHeader('Allow', ['PATCH'])
      res.status(405).json({ data: null, error: { message: `Method ${method} Not Allowed` } })
  }
}

const updateUserSchema = z.object({
  ban_duration: z.string().optional(),
})

const handlePatch = async (req: NextApiRequest, res: NextApiResponse) => {
  const { id } = req.query
  const parsed = updateUserSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: { message: 'Invalid request body', issues: parsed.error.issues } })
  }

  const { ban_duration } = parsed.data
  const { data, error } = await supabase.auth.admin.updateUserById(id as string, { ban_duration })

  if (error) return res.status(400).json({ error: { message: error.message } })
  return res.status(200).json(data.user)
}

const handleDelete = async (req: NextApiRequest, res: NextApiResponse) => {
  const { id } = req.query
  const { data, error } = await supabase.auth.admin.deleteUser(id as string)

  if (error) return res.status(400).json({ error: { message: error.message } })
  return res.status(200).json(data)
}
