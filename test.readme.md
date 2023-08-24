## Generate the audit.json file

```
npm audit --registry=https://registry.npmjs.org --json > audit.json
npm audit --json --registry=https://registry.npmjs.org > output.json
```

Output file to html example

```
npm audit --json | npm-audit-html --template white --output audit-report.html
npm audit --json | npm-audit-html --output audit-report.html
```
