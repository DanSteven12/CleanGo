const fs = require('fs');
const path = require('path');

const frontendPkgPath = path.join(__dirname, 'frontend', 'package.json');
const backendPkgPath = path.join(__dirname, 'backend', 'package.json');

function validateModule(name, pkgPath) {
  if (!fs.existsSync(pkgPath)) {
    console.error(`Error: The module '${name}' is missing the package.json file at: ${pkgPath}`);
    return false;
  }
  
  try {
    const content = fs.readFileSync(pkgPath, 'utf8');
    const pkg = JSON.parse(content);
    if (!pkg.scripts || !pkg.scripts.dev) {
      console.error(`Error: The module '${name}' package.json does not contain a "dev" script.`);
      return false;
    }
  } catch (err) {
    console.error(`Error: The module '${name}' package.json is invalid JSON. Details: ${err.message}`);
    return false;
  }
  
  return true;
}

const isFrontendValid = validateModule('frontend', frontendPkgPath);
const isBackendValid = validateModule('backend', backendPkgPath);

if (!isFrontendValid || !isBackendValid) {
  console.error('\nInitialization aborted: Both frontend and backend modules must exist and contain a valid package.json with a "dev" script.');
  process.exit(1);
}

console.log('Validation successful! Starting frontend and backend dev servers...');

try {
  const concurrently = require('concurrently');
  const { result } = concurrently([
    { command: 'npm --prefix frontend run dev', name: 'frontend', prefixColor: 'cyan' },
    { command: 'npm --prefix backend run dev', name: 'backend', prefixColor: 'magenta' }
  ], {
    killOthers: ['failure', 'success'],
    restartTries: 0,
  });
  
  result.then(
    () => process.exit(0),
    (err) => {
      console.error('Concurrently processes exited.', err);
      process.exit(1);
    }
  );
} catch (err) {
  console.error('Failed to load concurrently. Please ensure "npm install" has been run at the workspace root.');
  process.exit(1);
}
