# Introduction

This is a tool to check package's version strictly in project.We often encounter an unknown problem when the version of a package in a local environment is different from that in another environment, such as a production environment or another computer environment, resulting in different compiled script code.Therefore, this tool can be used to enforce consistency of package version Numbers across all environments, and hopefully it will be useful to you!

# Theory

- Check the following files in the package version number is exactly the same :`./node_modules` , `./package-lock.json` , `./package.json`
- Check the Node.js version with  installed if you set version in package.json via `engines.node`

# Usage

- Remove  fuzzy versions of the characters in package.json , such as `^`
- Add Node.js version in package.json if you want
- `npm install --save-dev x-package-version-strict-check`
- Add script in **package.json**

```javascript
  "scripts": {
    "check": "x-package-version-strict-check"
  }
```

- `npm run check`, if have some error, you will see them like this:

```bash
> x-package-version-strict-check
Please wait while checking the version information......
Start checking the version number in package.json...
Module jquery: package.json's version(1.3.1) is different with package-lock.json version(3.3.1)!
Module x-package-version-strict-check: package.json's version(1.5.0) is different with package-lock.json version(1.5.1)!
npm ERR! Test failed.  See above for more details.
```

# CLI

- `--path`: Specify the project root path which you want to check.

