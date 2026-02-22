export async function fetchRepoStructure(githubUrl: string): Promise<string> {
  const pythonEndpoint = process.env.PYTHON_SCRAPER_URL || 'http://localhost:8000/crawl';

  try {
    const res = await fetch(pythonEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repo_url: githubUrl })
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch repo structure. Status: ${res.status}`);
    }

    const data = await res.json();
    console.log(data);

    // Implement a simple retry/polling logic if scraper returns a 'task_id'
    if (data.task_id) {
      let attempts = 0;
      const maxAttempts = 12; // Poll 12 times (up to ~60s)
      let resultData = null;

      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Assuming a status endpoint like /crawl/status/{task_id}
        const pollRes = await fetch(`http://localhost:8000/crawl/status/${data.task_id}`);
        if (!pollRes.ok) continue;

        const pollData = await pollRes.json();

        if (pollData.status === 'completed') {
          resultData = pollData.result;
          break;
        } else if (pollData.status === 'failed') {
          throw new Error('Scraper task failed on the backend.');
        }

        attempts++;
      }

      if (!resultData) {
        throw new Error('Scraper task timed out.');
      }

      return JSON.stringify(resultData, null, 2);
    }

    // Immediate data return
    return JSON.stringify(data, null, 2);

  } catch (error) {
    console.error('Error fetching repo structure from Python Scraper:', error);
    throw new Error('Failed to retrieve codebase data.');
  }
}
