expect.extend({
  async toResolve(received) {
    try {
      const value = await received;
      return {
        message: () => `${received} resolved to ${value}`,
        pass: true,
      };
    } catch (e) {
      return {
        message: () =>
          `expected ${received} to resolve but was rejected with ${e}`,
        pass: false,
      };
    }
  },

  async toReject(received) {
    try {
      const value = await received;
      return {
        message: () => `expected Promise to reject but resolved to ${value}`,
        pass: false,
      };
    } catch (e) {
      return {
        message: () => `Promise rejected with ${e}`,
        pass: true,
      };
    }
  },
});
