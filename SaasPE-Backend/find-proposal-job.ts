import Queue from 'bull';

async function main() {
  const proposalId = '701f60b5-2411-426b-be98-207519c61d85';

  // Connect to the proposal queue
  const proposalQueue = new Queue('proposal', {
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    },
  });

  console.log(`Searching for jobs related to proposal: ${proposalId}\n`);

  // Check all job states
  const [waiting, active, completed, failed] = await Promise.all([
    proposalQueue.getWaiting(),
    proposalQueue.getActive(),
    proposalQueue.getCompleted(),
    proposalQueue.getFailed(),
  ]);

  const allJobs = [...waiting, ...active, ...completed, ...failed];
  const matchingJobs = allJobs.filter(job => job.data.proposalId === proposalId);

  if (matchingJobs.length === 0) {
    console.log('No jobs found for this proposal ID');
    console.log('This means the job was never created or has been completely removed from the queue');
  } else {
    console.log(`Found ${matchingJobs.length} job(s):\n`);
    for (const job of matchingJobs) {
      console.log(`Job ID: ${job.id}`);
      console.log(`State: ${await job.getState()}`);
      console.log(`Data:`, JSON.stringify(job.data, null, 2));
      console.log(`Attempts: ${job.attemptsMade}/${job.opts.attempts || 3}`);
      if (job.failedReason) {
        console.log(`Error: ${job.failedReason}`);
      }
      console.log('---');
    }
  }

  await proposalQueue.close();
}

main().catch(console.error);
