// Quick script to verify environment variables
require('dotenv').config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Environment Variables Check:');
console.log('URL:', url ? `✓ Present (${url.substring(0, 30)}...)` : '✗ Missing');
console.log('Key:', key ? `✓ Present (${key.substring(0, 30)}...)` : '✗ Missing');

if (!url || !key) {
  console.error('\n❌ Missing environment variables!');
  console.error('Please check your .env.local file.');
  process.exit(1);
} else {
  console.log('\n✅ All environment variables are present!');
}









