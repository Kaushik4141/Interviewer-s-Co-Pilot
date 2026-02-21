'use server';


export interface CreateInterviewRoomResult {
  url: string;
}

export async function createInterviewRoom(): Promise<CreateInterviewRoomResult> {
  const apiKey = process.env.DAILY_API_KEY;
  if (!apiKey) {
    throw new Error('Missing DAILY_API_KEY.');
  }

  return { url: `architectural-scout-${Date.now()}` };
}

