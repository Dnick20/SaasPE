import Queue from 'bull';

async function main() {
  // Connect to the proposal queue
  const proposalQueue = new Queue('proposal', {
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    },
  });

  console.log('=== Proposal Queue Status ===\n');

  // Get job counts
  const counts = await proposalQueue.getJobCounts();
  console.log('Job counts:', JSON.stringify(counts, null, 2));

  // Get waiting jobs
  const waitingJobs = await proposalQueue.getWaiting();
  console.log(`\nWaiting jobs: ${waitingJobs.length}`);
  for (const job of waitingJobs) {
    console.log('  -', job.id, job.data);
  }

  // Get active jobs
  const activeJobs = await proposalQueue.getActive();
  console.log(`\nActive jobs: ${activeJobs.length}`);
  for (const job of activeJobs) {
    console.log('  -', job.id, job.data);
  }

  // Get failed jobs
  const failedJobs = await proposalQueue.getFailed();
  console.log(`\nFailed jobs: ${failedJobs.length}`);
  for (const job of failedJobs.slice(0, 5)) {
    console.log(`  - Job ${job.id}:`);
    console.log('    Data:', job.data);
    console.log('    Error:', job.failedReason);
    console.log('    Stack:', job.stacktrace?.slice(0, 3).join('\n'));
  }

  // Get completed jobs (last 5)
  const completedJobs = await proposalQueue.getCompleted();
  console.log(`\nCompleted jobs: ${completedJobs.length} (showing last 5)`);
  for (const job of completedJobs.slice(0, 5)) {
    console.log('  -', job.id, job.data);
  }

  await proposalQueue.close();
}

main().catch(console.error);
