export function acceptsMarkdown(accept: string | null): boolean {
  if (!accept) return false

  return accept.split(',').some((part) => {
    const [mediaType, ...parameters] = part.trim().toLowerCase().split(';')
    if (mediaType.trim() !== 'text/markdown') return false

    const quality = parameters
      .map((parameter) => parameter.trim())
      .find((parameter) => parameter.startsWith('q='))
      ?.slice(2)

    return quality === undefined || Number(quality) > 0
  })
}

export function markdownTokenEstimate(markdown: string): string {
  return String(Math.max(1, Math.ceil(markdown.length / 4)))
}
