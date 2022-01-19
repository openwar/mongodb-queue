module.exports = {
  '*.{js,ts}': [
    'prettier --write',
    'eslint',
    // `lint:ts` can't receive files that doesn't know how to build/parse, thus
    // we ignore any files passed in from lint-staged here.
    () => 'yarn lint:ts',
  ],
  '*.{json,md,yml}': ['prettier --write'],
};
