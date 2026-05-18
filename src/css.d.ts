// Type declarations for side-effect CSS imports.
// Required by TypeScript 6.0+ which enforces TS2882 for untyped side-effect imports.
declare module '*.css';

// Vite resolves SVG imports to URL strings.
declare module '*.svg' {
  const url: string;
  export default url;
}
