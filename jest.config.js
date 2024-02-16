module.exports = {
  verbose: true,
  preset: "ts-jest",
  transform: {
    ".ts": [
      "ts-jest",
      {
        tsconfig: "./tsconfig.jest.json",
      },
    ],
  },
  moduleFileExtensions: ["js", "ts"],
  testTimeout: 1000,
};
