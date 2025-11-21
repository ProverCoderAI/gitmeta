# React Vite TypeScript Application

This is a React application built with Vite and TypeScript. It includes:

- React for building user interfaces
- TypeScript for static type checking
- Vite for fast development and building
- ESLint for code linting

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Clone the repository or copy the files
2. Install dependencies:

```bash
npm install
```

### Development

To start the development server:

```bash
npm run dev
```

This will start the development server at http://localhost:5173 with hot module replacement.

### Building

To build the application for production:

```bash
npm run build
```

This will create a `dist` directory with the optimized production build.

### Linting

To lint the code:

```bash
npm run lint
```

### Preview

To preview the production build locally:

```bash
npm run preview
```

## Project Structure

- `src/App.tsx` - Main application component
- `src/components/Welcome.tsx` - Sample component demonstrating TypeScript usage
- `src/main.tsx` - Entry point for the React application
- `vite.config.ts` - Vite configuration
- `tsconfig.json` - TypeScript configuration
- `package.json` - Project dependencies and scripts

## Features

- Fast refresh during development with Vite
- Type safety with TypeScript
- Modern ESNext features
- Bundled with ESBuild for fast builds
- CSS support out of the box
- Pre-configured with React and JSX support

## Technologies Used

- [React](https://react.dev) - A JavaScript library for building user interfaces
- [Vite](https://vite.dev) - Next-generation frontend tooling
- [TypeScript](https://www.typescriptlang.org/) - Typed JavaScript at any scale
- [ESLint](https://eslint.org/) - Pluggable JavaScript linter