import { createClient } from '@supabase/supabase-js'
import apiWrapper from 'lib/api/apiWrapper'
import { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'

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

const listObjectsSchema = z.object({
  path: z.string().optional(),
  options: z
    .object({
      limit: z.number().optional(),
      offset: z.number().optional(),
      sortBy: z.object({ column: z.string(), order: z.string() }).optional(),
      search: z.string().optional(),
    })
    .optional(),
})

const handlePost = async (req: NextApiRequest, res: NextApiResponse) => {
  const { id } = req.query
  const parsed = listObjectsSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: { message: 'Invalid request body', issues: parsed.error.issues } })
  }

  const { path, options } = parsed.data
  const { data, error } = await supabase.storage.from(id as string).list(path, options)
  if (error) {
    return res.status(500).json({ error: error.message })
  }

  return res.status(200).json(data)
}
