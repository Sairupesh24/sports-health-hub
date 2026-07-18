const { execSync } = require('child_process');

try {
  // Get differing files
  const output = execSync('git diff test dev --name-only', { encoding: 'utf8' });
  const files = output.split('\n').map(f => f.trim()).filter(Boolean);

  console.log(`Found ${files.length} total differing files.`);

  // Filter out prisma, environment, uploads, scratch files
  const filesToSync = files.filter(file => {
    const isPrisma = file.toLowerCase().includes('prisma');
    const isEnv = file.includes('.env');
    const isGitIgnore = file.includes('.gitignore');
    const isUpload = file.includes('public/uploads/');
    const isScratch = file.startsWith('scratch/');
    return !isPrisma && !isEnv && !isGitIgnore && !isUpload && !isScratch;
  });

  console.log(`Syncing ${filesToSync.length} source files from dev...`);

  let successCount = 0;
  for (const file of filesToSync) {
    try {
      execSync(`git checkout dev -- "${file}"`);
      console.log(`Successfully checked out: ${file}`);
      successCount++;
    } catch (err) {
      console.warn(`Failed to checkout ${file}:`, err.message.trim());
    }
  }

  console.log(`Sync completed! Successfully synced ${successCount}/${filesToSync.length} files.`);
} catch (error) {
  console.error('Error during synchronization:', error.message);
}
