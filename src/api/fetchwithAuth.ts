/**
 * src/api/fetchWithAuth.ts
 *
 * A utility function for making authenticated API requests.
 * It automatically retrieves the current user's session token from AWS Amplify
 * and adds it to the request headers.
 */
import { fetchAuthSession } from 'aws-amplify/auth';

export const fetchWithAuth = async (url: string, options: RequestInit = {}): Promise<Response> => {
  try {
    // Retrieve the session from Amplify
    const session = await fetchAuthSession();
    const token = session.tokens?.idToken?.toString();

    // Use the Headers class for type safety and easier manipulation
    const headers = new Headers(options.headers);
    headers.set('Content-Type', 'application/json');

    // Add the Authorization token if it exists
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    // Perform the fetch request with the updated options
    return fetch(url, { ...options, headers });

  } catch (error) {
    console.error("Amplify Auth Error:", error);
    // Fallback to a regular fetch if auth fails, but still ensure Content-Type is set
    const headers = new Headers(options.headers);
    headers.set('Content-Type', 'application/json');
    return fetch(url, { ...options, headers });
  }
};
