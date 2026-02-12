import { createClient } from '@supabase/supabase-js'
import apiWrapper from 'lib/api/apiWrapper'
import { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

export default (req: NextApiRequest, res: NextApiResponse) => apiWrapper(req, res, handler)

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req

  switch (method) {
    case 'DELETE':
      return handleDelete(req, res)
    default:
      res.setHeader('Allow', ['DELETE'])
      res.status(405).json({ data: null, error: { message: `Method ${method} Not Allowed` } })
  }
}

const deleteObjectsSchema = z.object({
  paths: z.array(z.string()).min(1),
})

const handleDelete = async (req: NextApiRequest, res: NextApiResponse) => {
  const { id } = req.query
  const parsed = deleteObjectsSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: { message: 'Invalid request body', issues: parsed.error.issues } })
  }

  const { paths } = req.body
  const { data, error } = await supabase.storage.from(id as string).remove(paths as string[])
  if (error) {
    return res.status(400).json({ error: { message: error.message } })
  }

  return res.status(200).json(data)
}
