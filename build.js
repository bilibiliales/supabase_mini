const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const outDir = path.join(__dirname, 'dist');
fs.mkdirSync(outDir, { recursive: true });

esbuild.buildSync({
  entryPoints: [path.join(__dirname, 'supabase-mini', 'src', 'index.js')],
  bundle: true,
  minify: false,
  format: 'iife',
  platform: 'browser',
  target: ['es2018'],
  outfile: path.join(outDir, 'supabase-mini.js'),
  globalName: 'Supabase',
  define: {
    'process.env.NODE_ENV': '"production"',
  },
});

console.log('Built dist/supabase-mini.js');
