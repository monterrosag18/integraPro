export type GithubRepo = {
  type: 'repo'
  name: string
  fullName: string
  description: string | null
  language: string | null
  stars: number
  htmlUrl: string
  updatedAt: string
  owner: string
}

export type GithubGist = {
  type: 'gist'
  description: string
  firstFile: { filename: string; language: string | null; content: string }
  owner: string
  htmlUrl: string
  updatedAt: string
}

export type GithubOrg = {
  type: 'org'
  login: string
  name: string | null
  description: string | null
  publicRepos: number
  avatarUrl: string
  htmlUrl: string
}

export type GithubMeta = GithubRepo | GithubGist | GithubOrg

function parseGithubUrl(url: string): { apiUrl: string; kind: 'repo' | 'gist' | 'org' } | null {
  try {
    const u = new URL(url)
    if (u.hostname === 'gist.github.com') {
      const parts = u.pathname.split('/').filter(Boolean)
      const gistId = parts.length >= 2 ? parts[1] : parts[0]
      if (!gistId) return null
      return { apiUrl: `https://api.github.com/gists/${gistId}`, kind: 'gist' }
    }
    if (u.hostname === 'github.com') {
      const parts = u.pathname.split('/').filter(Boolean)
      if (parts.length >= 2) return { apiUrl: `https://api.github.com/repos/${parts[0]}/${parts[1]}`, kind: 'repo' }
      if (parts.length === 1) return { apiUrl: `https://api.github.com/orgs/${parts[0]}`, kind: 'org' }
    }
    return null
  } catch { return null }
}

export async function fetchGithubMeta(url: string): Promise<GithubMeta | null> {
  const parsed = parseGithubUrl(url)
  if (!parsed) return null

  const headers = { Accept: 'application/vnd.github+json' }

  try {
    let res = await fetch(parsed.apiUrl, { headers })

    if (!res.ok && parsed.kind === 'org') {
      const orgName = parsed.apiUrl.split('/orgs/')[1]
      res = await fetch(`https://api.github.com/users/${orgName}`, { headers })
    }

    if (!res.ok) return null
    const d = await res.json() as Record<string, unknown>

    if (parsed.kind === 'gist') {
      const files = d.files as Record<string, { filename: string; language: string | null; content: string }>
      const firstFile = Object.values(files)[0]
      if (!firstFile) return null
      return {
        type: 'gist',
        description: (d.description as string) ?? '',
        firstFile,
        owner: (d.owner as { login: string })?.login ?? 'unknown',
        htmlUrl: d.html_url as string,
        updatedAt: d.updated_at as string,
      }
    }

    if (parsed.kind === 'repo') {
      return {
        type: 'repo',
        name: d.name as string,
        fullName: d.full_name as string,
        description: (d.description as string | null) ?? null,
        language: (d.language as string | null) ?? null,
        stars: d.stargazers_count as number,
        htmlUrl: d.html_url as string,
        updatedAt: d.updated_at as string,
        owner: (d.owner as { login: string })?.login ?? '',
      }
    }

    return {
      type: 'org',
      login: d.login as string,
      name: (d.name as string | null) ?? null,
      description: ((d.description ?? d.bio) as string | null) ?? null,
      publicRepos: (d.public_repos as number) ?? 0,
      avatarUrl: d.avatar_url as string,
      htmlUrl: d.html_url as string,
    }
  } catch { return null }
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'hoy'
  if (days === 1) return 'ayer'
  if (days < 30) return `hace ${days} días`
  const months = Math.floor(days / 30)
  return `hace ${months} mes${months !== 1 ? 'es' : ''}`
}
