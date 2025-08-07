export default {
  '*.{ts,tsx}': [
    'eslint --fix',
    'prettier --write',
    'git add'
  ],
  '*.{js,jsx}': [
    'eslint --fix', 
    'prettier --write',
    'git add'
  ],
  '*.{json,md,yml,yaml}': [
    'prettier --write',
    'git add'
  ]
};