export const SITE = {
  name: 'le.ad',
  expansion: 'active desk',
  url: 'https://james-gibson.github.io/le.ad/',
  repo: 'https://github.com/james-gibson/le.ad',
  /**
   * The action this seed exists for. le.gume's door asks an agent to clone it;
   * a desk's asks for a desk, which is a different sentence even though the
   * door (llms.txt) is the same shape.
   */
  action: {
    label: 'take a desk',
    desk: 'ad-01',
  },
  /** The one door for an agent. There is exactly one; the guard counts it. */
  handoff:
    'Read https://james-gibson.github.io/le.ad/llms.txt — the protocol and the publish path. Nothing is built to take a desk; the deploy builds itself.',
} as const
