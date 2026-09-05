/** Unit tests for pure logic modules (lib/). Component tests can join later —
 * the preset already wires the RN/Expo transformer. */
module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/__tests__/**/*.test.ts'],
  // lib/ modules under test mock their expo dependencies explicitly.
  clearMocks: true,
};
