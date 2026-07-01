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
  console.error('\nValidation failed: One or more modules are missing or invalid.');
  process.exit(1);
}

console.log('Validation successful! Both frontend and backend modules are configured correctly.');
process.exit(0);
