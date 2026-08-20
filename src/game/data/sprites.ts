/** Resolve Viral Dex sprite paths under public/assets/sprites. */
export type SpriteKind = 'monsters' | 'weapons' | 'armor' | 'accessories'

export function spriteUrl(kind: SpriteKind, id: string): string {
  const base = import.meta.env.BASE_URL || '/'
  return `${base}assets/sprites/${kind}/${id}.png`
}
