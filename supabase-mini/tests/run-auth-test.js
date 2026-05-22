const { auth, db } = require('../src');

const baseUrl = process.env.SUPABASE_URL;
const apiKey = process.env.SUPABASE_API_KEY || process.env.SUPABASE_ANON_KEY;

if (!baseUrl) {
  throw new Error('SUPABASE_URL is required in environment variables');
}

if (!apiKey) {
  throw new Error('SUPABASE_API_KEY or SUPABASE_ANON_KEY is required in environment variables');
}

const password = 'Test1234!';
const uniqueId = Math.random().toString(36).slice(2, 10);
const email = `supabase-mini-test+${uniqueId}@example.com`;

async function run() {
  console.log('SUPABASE_URL=', baseUrl);
  console.log('Using test email:', email);

  const signUpResult = await auth.signUp({ email, password }, { baseUrl, apikey: apiKey });
  console.log('signUp result:', signUpResult);

  const signInResult = await auth.signIn({ email, password }, { baseUrl, apikey: apiKey });
  console.log('signIn result:', signInResult);

  const accessToken = signInResult.access_token || signInResult.session?.access_token;
  const refreshToken = signInResult.refresh_token || signInResult.session?.refresh_token;

  if (!accessToken) {
    throw new Error('Failed to obtain access token from signIn result');
  }

  const user = await auth.getUser({ baseUrl, apikey: apiKey, token: accessToken });
  console.log('getUser result:', user);

  const profileRows = await db.select('profiles', { eq: { id: user?.id }, limit: 1 }, { baseUrl, apikey: apiKey, token: accessToken });
  console.log('db.select profiles result:', profileRows);

  console.log('Test flow completed successfully.');
}

run().catch((error) => {
  console.error('Test failed:', error.message);
  if (error.body) {
    console.error('Error body:', JSON.stringify(error.body, null, 2));
  }
  process.exit(1);
});
