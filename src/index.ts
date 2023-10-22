#!/usr/bin/env node
// @ts-ignore
import * as fs from 'fs-extra';
import * as path from 'path';
import { execSync, spawn } from 'child_process';
import { promisify } from 'util';

interface FixAvailable {
  version: string;
  isSemVerMajor: boolean;
}

interface Advisory {
  name: string;
  severity: string;
  fixAvailable: FixAvailable;
}

const options = {
  stdio: 'inherit',
  maxBuffer: 1024 * 1024, // 1MB
  encoding: 'utf8',
};

const execAsync = promisify(execSync);

async function generateAuditJson(registry: string | null) {
  try {
    if (registry) {
      execSync(`npm audit --json --registry=${registry} > audit.json`, {
        stdio: 'inherit',
        encoding: 'utf8',
        maxBuffer: 1024 * 1024 * 100,
      });
    } else {
      execSync('npm audit --json > audit.json', {
        stdio: 'inherit',
        encoding: 'utf8',
        maxBuffer: 1024 * 1024 * 100,
      });
    }
    // Check if the audit.json file exists
    if (fs.existsSync('audit.json')) {
      console.log('audit.json generated.');
    } else {
      console.error('Error: audit.json was not generated.');
    }
    console.log('audit.json generated.');
    return;
  } catch (error: any) {
    // Add a delay of 3 seconds
    setTimeout(() => {
      // Check again if the audit.json file exists
      if (fs.existsSync('audit.json')) {
        /// console.log('audit.json generated.');
      } else {
        console.error('Error: audit.json was not generated.');
      }
    }, 3000); // Delay of 3000 milliseconds (3 seconds)
  }
  return;
}

async function updatePackageWithResolutions(args: string[]) {
  const auditFilePath = path.join(process.cwd(), 'audit.json');
  const packageFilePath = path.join(process.cwd(), 'package.json');
  const packageLockFilePath = path.join(process.cwd(), 'package-lock.json');
  let hasPackageLockFile = false;

  // check if args has --registry flag with value passed
  let registryProp = null;
  if (args.includes('--registry')) {
    const registry = args[args.indexOf('--registry') + 1];
    console.log('registry', registry);
    registryProp = registry;
  }

  // Check if package-lock.json file is missing and generate it if necessary
  if (!fs.existsSync(packageLockFilePath)) {
    console.log(
      'package-lock.json file is missing. Generating it now.... It will be deleted after the upgrade.',
    );

    if (!registryProp) {
      execSync(
        `npm i --package-lock-only --legacy-peer-deps --registry=${registryProp} `,
        // @ts-ignore
        options,
      );
      hasPackageLockFile = false; // keep this flag after generating false, so we can delete it later.
    } else {
      // @ts-ignore
      execSync('npm i --package-lock-only --legacy-peer-deps', options);
      hasPackageLockFile = false; // keep this flag after generating false, so we can delete it later.
    }
  } else {
    hasPackageLockFile = true;
  }

  // clean up audit.json file
  if (fs.existsSync('audit.json')) {
    // delete file
    fs.unlinkSync('audit.json');
  }

  await generateAuditJson(registryProp);
  // // Generate audit.json file if it doesn't exist
  if (!fs.existsSync(auditFilePath)) {
    return;
  }

  // Read audit.json file
  const auditData = fs.readFileSync(auditFilePath, 'utf8');
  const auditJson = JSON.parse(auditData);

  if (auditJson && auditJson.metadata) {
    console.log('auditJson has all the metada to process');
  } else {
    console.error(
      'auditJson is missing metadata. You could be behind proxy. Try again with --registry flag to point to the right registry.',
    );
    return;
  }
  console.log('completed npm audit');
  console.log('analyzing audit.json');

  // Find vulnerabilities with patches
  const patches: { [key: string]: string } = {};
  for (const [vulnId, vulnData] of Object.entries(auditJson.vulnerabilities)) {
    const { name, severity, fixAvailable } = vulnData as Advisory;
    const { version, isSemVerMajor } = fixAvailable || {};

    if (!isSemVerMajor && version) {
      patches[name] = version;
    }

    if (args.includes('--major') && version) {
      patches[name] = version;
    }
  }

  // Modify package.json file
  const packageData = fs.readFileSync(packageFilePath, 'utf8');
  const packageJson = JSON.parse(packageData);
  if (!packageJson.resolutions) {
    packageJson.resolutions = {};
  }
  packageJson.resolutions = {
    ...packageJson.resolutions,
    ...patches,
  };

  // Write back to package.json
  fs.writeFileSync(
    packageFilePath,
    JSON.stringify(packageJson, null, 2),
    'utf8',
  );

  // Run npm-force-resolutions to install all the patched versions
  // Run npm-force-resolutions if --force flag is provided
  if (args.includes('--force-resolutions')) {
    console.log('running npm-force-resolutions');
    if (!registryProp) {
      await execAsync(`npx npm-force-resolutions --registry=${registryProp}`);
    } else {
      execAsync('npx npm-force-resolutions')
        // @ts-ignore
        .then(({ stdout, stderr }: { stdout: any; stderr: any }) => {
          console.log('completed npm-force-resolutions');
          console.log(stdout);
          console.log(stderr);
        })
        .catch((err: any) => {
          console.error(err);
        });
    }
    console.log('completed npm-force-resolutions');
  } // EOF exec npm-force-resolutions
  console.log('completed upgrade. Check package.json for resolutions.');

  if (!hasPackageLockFile && !args.includes('--keep-package-lock')) {
    // Delete package-lock.json file
    fs.unlinkSync(packageLockFilePath);
  }

  // keep the file if the args passed in includes --keep-audit
  // clean up audit.json file
  if (fs.existsSync('audit.json') && !args.includes('--keep-audit')) {
    // delete file
    fs.unlinkSync('audit.json');
    process.exit(0);
  } else {
    process.exit(0);
  }
}

// Get command-line arguments
const args = process.argv.slice(2);
/// console.log('args', args);
if (args.length <= 0) {
  console.error(
    'Usage: npx npm-update-resolutions -- --force-resolution --major',
  );
  process.exit(1);
}

// Usage
updatePackageWithResolutions(args);
