# npm-update-resolutions

npm-update-resolutions.

## Installation

```js
npm install -g npm-update-resolutions
```

## Usage

To fix the npm dependencies

```js
npx npm-update-resolutions --force-resolutions --major
```

## Release

Only collaborators with credentials can release and publish:

```sh
npm run release
git push --follow-tags && npm publish
```

To see what files are going to be published, run the command:

```sh
npm pack --dry-run
# tar tvf $(npm pack)
```

## License

[MIT](https://github.com/remarkablemark/npm-package-template/blob/master/LICENSE)
