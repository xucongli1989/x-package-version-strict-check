# x-package-version-strict-check
A tool to check package's version strictly in project.

# introduction

We often encounter an unknown problem when the version of a package in a local environment is different from that in another environment, such as a production environment or another computer environment, resulting in different compiled script code.Therefore, this tool can be used to enforce consistency of package version Numbers across all environments, and hopefully it will be useful to you!

# Usage

- npm install --save-dev x-package-version-strict-check
- Add script in package.json

```javascript
  "scripts": {
    "check": "npm shrinkwrap --dev && x-package-version-strict-check"
  }
```

- npm run check

