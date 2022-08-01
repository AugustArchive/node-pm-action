# 🦆 Node Package Managers Cache

> _GitHub action to cache Yarn, NPM, and PNPM cache directories!_

**node-pm-cache** is a GitHub Action to cache Yarn, NPM, and PNPM caching directories alongside with `node_modules` so your workflows can go speed! :zap:

## Example Workflow

```yml
name: My Workflow
on:
  push: {}
jobs:
  workflow:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v3

      - name: Setup Node.js 18
        uses: actions/setup-node@v3
        with:
          node-version: 18.x

      - name: Cache Yarn and node-modules
        uses: auguwu/node-pm-cache@master
        with:
          node-modules: ./node_modules
          package-manager: yarn # Leave this out to let the action to detect it.
```

This will produce a cache bundle with the following keys:

- `<pm>-<os>-<node-version>-<hashed yarn.lock/package-lock.json>`

## License

**node-pm-cache** is released under the **MIT License** with love ☆⌒ ヽ(\*'､^\*)chu by Noel. :3
