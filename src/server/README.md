![example workflow](https://github.com/rzgry/Express-REST-API-Template/actions/workflows/node.js.yml/badge.svg)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://github.com/prettier/prettier)

# Express-REST-API-Template

Simple express boilerplate based off of [express-generator](https://expressjs.com/en/starter/generator.html). Includes [eslint](https://eslint.org) and [prettier](https://prettier.io) for linting/code formatting, [nodemon](https://github.com/remy/nodemon) for automatic server restarting, and [Jest](https://jestjs.io) for testing.

## Getting Started

### Install dependencies

```
npm install
```

### Running in development

```
npm run dev
```

### Running in production

```
npm start
```

Runs on localhost:7777 by default but can be configured using the `PORT` environment variable.

### Running tests

```
npm test

# Watch repo
npm run test:watch
```

### Linting
```
npm run lint

# fix issues
npm run lint:fix
```
