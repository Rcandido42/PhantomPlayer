const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const JavaScriptObfuscator = require('javascript-obfuscator');

const TEMP_DIR = path.join(__dirname, '..', 'build-temp');
const DIST_DIR = path.join(__dirname, '..', 'dist');

// Obfuscation configuration (Strong, but safe for Electron environment)
const OBFUSCATION_OPTIONS = {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.6,
  deadCodeInjection: false, // Turned off for performance & stability in Electron IPC
  debugProtection: false,
  debugProtectionInterval: 0,
  disableConsoleOutput: false,
  identifierNamesGenerator: 'hexadecimal',
  log: false,
  numbersToExpressions: true,
  renameGlobals: false, // Set to false to avoid breaking IPC/contextBridge bindings
  selfDefending: false,
  simplify: true,
  splitStrings: true,
  splitStringsChunkLength: 8,
  stringArray: true,
  stringArrayCallsTransform: true,
  stringArrayCallsTransformThreshold: 0.5,
  stringArrayEncoding: ['base64'],
  stringArrayIndexShift: true,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayWrappersCount: 1,
  stringArrayWrappersChainedCalls: true,
  stringArrayWrappersParametersMaxCount: 2,
  stringArrayWrappersType: 'variable',
  stringArrayThreshold: 0.75,
  transformObjectKeys: false,
  unicodeEscapeSequence: false
};

/**
 * Clean up the temporary directory.
 */
function cleanTempDir() {
  if (fs.existsSync(TEMP_DIR)) {
    console.log(`[Build] Removendo diretório temporário antigo...`);
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });
  }
}

/**
 * Copy directory recursively and obfuscate JS files.
 */
function copyAndObfuscate(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();

  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((childItemName) => {
      // Skip node_modules, dist, .git, scripts, build-temp
      if (['node_modules', 'dist', '.git', 'scripts', 'build-temp'].includes(childItemName)) {
        return;
      }
      copyAndObfuscate(
        path.join(src, childItemName),
        path.join(dest, childItemName)
      );
    });
  } else {
    // If it's a file
    const ext = path.extname(src).toLowerCase();
    
    if (ext === '.js') {
      console.log(`[Build] Ofuscando: ${path.relative(path.join(__dirname, '..'), src)}`);
      const code = fs.readFileSync(src, 'utf8');
      try {
        const obfuscationResult = JavaScriptObfuscator.obfuscate(code, OBFUSCATION_OPTIONS);
        fs.writeFileSync(dest, obfuscationResult.getObfuscatedCode(), 'utf8');
      } catch (err) {
        console.error(`[Build ERROR] Falha ao ofuscar ${src}:`, err.message);
        // Fallback: write original code if obfuscation fails
        fs.writeFileSync(dest, code, 'utf8');
      }
    } else {
      // Direct copy for all other files (html, css, png, ico, json, etc.)
      fs.copyFileSync(src, dest);
    }
  }
}

async function main() {
  console.log('==================================================');
  console.log('🛡️  PHANTOMPLAYER - INICIANDO PIPELINE DE COMPILAÇÃO');
  console.log('==================================================');

  try {
    cleanTempDir();

    console.log('[Build] Criando estrutura temporária e ofuscando código...');
    fs.mkdirSync(TEMP_DIR, { recursive: true });

    // Copy and obfuscate main workspace files into build-temp
    const rootDir = path.join(__dirname, '..');
    
    fs.readdirSync(rootDir).forEach((item) => {
      if (['node_modules', 'dist', '.git', 'scripts', 'build-temp'].includes(item)) {
        return;
      }
      copyAndObfuscate(path.join(rootDir, item), path.join(TEMP_DIR, item));
    });

    console.log('[Build] Copiando dependências de produção para build-temp...');
    // Create an empty node_modules in build-temp or run npm install
    // electron-builder handles node_modules by copying them from the parent dir or using projectDir.
    // To be perfectly safe, we copy node_modules to build-temp or let electron-builder look it up.
    // By default, electron-builder can look at parent directory node_modules, but copying package-lock.json and node_modules is safer.
    if (fs.existsSync(path.join(rootDir, 'node_modules'))) {
      // Create symlink or let it run. Let's create a junction/symlink for node_modules in build-temp
      // to avoid copying massive folders. On Windows, junctions work perfectly.
      const tempNodeModules = path.join(TEMP_DIR, 'node_modules');
      console.log('[Build] Vinculando node_modules de desenvolvimento...');
      if (process.platform === 'win32') {
        execSync(`mklink /J "${tempNodeModules}" "${path.join(rootDir, 'node_modules')}"`);
      } else {
        fs.symlinkSync(path.join(rootDir, 'node_modules'), tempNodeModules, 'dir');
      }
    }

    console.log('[Build] Iniciando empacotamento com o electron-builder...');
    // Run electron-builder, targeting the build-temp directory
    // We override directories.output so that the installers are built in our main root './dist' directory!
    execSync(`npx electron-builder build --projectDir "${TEMP_DIR}" -c.directories.output="${DIST_DIR}"`, {
      stdio: 'inherit',
      cwd: rootDir
    });

    console.log('==================================================');
    console.log('🎉 COMPILAÇÃO E OFUSCAÇÃO CONCLUÍDAS COM SUCESSO!');
    console.log('==================================================');

  } catch (err) {
    console.error('\n❌ Erro durante o processo de compilação:', err.message);
    process.exit(1);
  } finally {
    // Cleanup junction/symlink before deleting directory to avoid deleting original node_modules files on some systems
    const tempNodeModules = path.join(TEMP_DIR, 'node_modules');
    if (fs.existsSync(tempNodeModules)) {
      if (process.platform === 'win32') {
        execSync(`rmdir "${tempNodeModules}"`);
      } else {
        fs.unlinkSync(tempNodeModules);
      }
    }
    cleanTempDir();
  }
}

main();
