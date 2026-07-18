const { execSync } = require('child_process');

try {
  // Get differing files
  const output = execSync('git diff test dev --name-only', { encoding: 'utf8' });
  const files = output.split('\n').map(f => f.trim()).filter(Boolean);

  console.log(`Found ${files.length} total differing files.`);

  // Filter out prisma-related schema & environment files
  const filesToSync = files.filter(file => {
    const isPrisma = file.toLowerCase().includes('prisma');
    const isEnv = file.includes('.env');
    const isGitIgnore = file.includes('.gitignore');
    return !isPrisma && !isEnv && !isGitIgnore;
  });

  console.log(`Syncing ${filesToSync.length} source files from dev...`);

  if (filesToSync.length > 0) {
    // Sync files in chunks to avoid command line length limits
    const chunkSize = 20;
    for (let i = 0; i < filesToSync.length; i += chunkSize) {
      const chunk = filesToSync.slice(i, i + chunkSize);
      const command = `git checkout dev -- ${chunk.join(' ')}`;
      console.log(`Executing: ${command}`);
      execSync(command);
    }
    console.log('Sync completed successfully!');
  } else {
    console.log('No files to sync.');
  }
} catch (error) {
  console.error('Error during synchronization:', error.message);
  if (error.stdout) console.log(error.stdout);
  if (error.stderr) console.error(error.stderr);
}
