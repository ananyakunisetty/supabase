import { createClient } from '@supabase/supabase-js'
import { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'

import apiWrapper from 'lib/api/apiWrapper'

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

export default (req: NextApiRequest, res: NextApiResponse) => apiWrapper(req, res, handler)

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req

  switch (method) {
    case 'POST':
      return handlePost(req, res)
    default:
      res.setHeader('Allow', ['POST'])
      res.status(405).json({ data: null, error: { message: `Method ${method} Not Allowed` } })
  }
}

const createUserSchema = z
  .object({
    email: z.string().email().optional(),
    phone: z.string().optional(),
    password: z.string().min(6).optional(),
    email_confirm: z.boolean().optional(),
    phone_confirm: z.boolean().optional(),
  })
  .passthrough() // Allow additional GoTrueAdmin fields like user_metadata

const handlePost = async (req: NextApiRequest, res: NextApiResponse) => {
  const parsed = createUserSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: { message: 'Invalid request body', issues: parsed.error.issues } })
  }

  const { data, error } = await supabase.auth.admin.createUser(parsed.data)

  if (error) return res.status(400).json({ error: { message: error.message } })
  return res.status(200).json(data.user)
}
