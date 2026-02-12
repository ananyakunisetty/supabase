import { CheckCNAMERecordResponse } from 'data/custom-domains/check-cname-mutation'
import { NextApiRequest, NextApiResponse } from 'next'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { domain } = req.query
  const domainStr = Array.isArray(domain) ? domain[0] : domain

  if (!domainStr || !/^[a-zA-Z0-9][a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(domainStr)) {
    return res.status(400).json({ message: 'Invalid domain format' })
  }

  try {
    const result: CheckCNAMERecordResponse = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${domainStr}&type=CNAME`,
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
