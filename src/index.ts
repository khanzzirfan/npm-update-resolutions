import * as fs from 'fs-extra';
import * as path from 'path';
import { exec } from 'child_process';

function updatePackageWithResolutions(auditFilePath, packageFilePath) {
  // Read audit.json file
  fs.readFile(auditFilePath, 'utf8', (err, auditData) => {
    if (err) {
      console.error('Error reading audit.json:', err);
      return;
    }

    try {
      const auditDataParsed = JSON.parse(auditData);

      const resolutions = {};
      // Assuming auditDataParsed contains vulnerability data with patches
      // You need to extract the relevant information and populate 'resolutions'

      // Update package.json with resolutions
      fs.readFile(packageFilePath, 'utf8', (err, packageData) => {
        if (err) {
          console.error('Error reading package.json:', err);
          return;
        }

        try {
          const packageDataParsed = JSON.parse(packageData);
          packageDataParsed.resolutions = resolutions;

          // Write back to package.json
          fs.writeFile(
            packageFilePath,
            JSON.stringify(packageDataParsed, null, 2),
            'utf8',
            (err) => {
              if (err) {
                console.error('Error writing to package.json:', err);
                return;
              }

              console.log('package.json updated with resolutions.');

              // Run npx force-resolutions using child process
              exec('npx force-resolutions', (error, stdout, stderr) => {
                if (error) {
                  console.error('Error running npx force-resolutions:', error);
                  return;
                }
                console.log('npx force-resolutions completed.');
                console.log(stdout);
              });
            }
          );
        } catch (err) {
          console.error('Error parsing package.json:', err);
        }
      });
    } catch (err) {
      console.error('Error parsing audit.json:', err);
    }
  });
}

// Usage
updatePackageWithResolutions('audit.json', 'package.json');
