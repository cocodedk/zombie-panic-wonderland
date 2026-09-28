// WebMCP: two read-only tools for an AI agent in the visitor's browser.
// Spec (a draft that has already moved once): https://webmachinelearning.github.io/webmcp/

export const DESCRIPTION =
  'A low-poly 3D browser game, Zombie Panic in Wonderland, where you hold a ruined road against five waves of zombies and the Zombie King.';

const READ_ONLY = { readOnlyHint: true };

export function tools(game) {
  return [
    {
      name: 'describe',
      title: 'What this page is',
      description: 'Returns { description }: one English sentence saying what this page is.',
      inputSchema: { type: 'object', properties: {} },
      annotations: READ_ONLY,
      execute: async () => ({ description: DESCRIPTION }),
    },
    {
      name: 'get_state',
      title: 'The game right now',
      description:
        'Returns { screen, wave, score, hearts, enemies, boss_health }: screen is one of loading, error, title, intro, play, paused, victory or defeat; enemies is how many are on the field; boss_health is the Zombie King\'s remaining hits, or null until it appears.',
      inputSchema: { type: 'object', properties: {} },
      annotations: READ_ONLY,
      execute: async () => game.snapshot(),
    },
  ];
}

// Resolves to the names the registry accepted. Never rejects: a refusing registry must not stop the game.
export async function registerWebMcp(registry, game) {
  if (!registry || typeof registry.registerTool !== 'function') return [];
  const held = await Promise.all(tools(game).map((tool) => Promise.resolve()
    .then(() => registry.registerTool(tool))
    .then(() => tool.name, () => null)));
  return held.filter(Boolean);
}
