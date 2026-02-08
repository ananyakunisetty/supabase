import { CheckCNAMERecordResponse } from 'data/custom-domains/check-cname-mutation'
import { NextApiRequest, NextApiResponse } from 'next'

const DEFAULT_RESOLVER = 'https://cloudflare-dns.com/dns-query'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { domain, type = 'CNAME', resolver } = req.query

  const resolverUrl = typeof resolver === 'string' ? resolver : DEFAULT_RESOLVER

  try {
    const result: CheckCNAMERecordResponse = await fetch(
      `${resolverUrl}?name=${domain}&type=${type}`,
      {
        method: 'GET',
        headers: { Accept: 'application/dns-json' },
      }
    ).then((res) => res.json())
    return res.status(200).json(result)
  } catch (error: any) {
    return res.status(400).json({ message: error.message })
  }
}

export default handler
