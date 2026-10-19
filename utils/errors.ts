export function getFriendlyError(error: unknown): string {
  if (!error) return 'Something went wrong. Please try again.';

  const message = typeof error === 'object' && error !== null && 'message' in error
    ? String((error as { message: unknown }).message)
    : String(error);

  if (message.includes('Failed to fetch') || message.includes('Network request failed')) {
    return 'Connection problem. Please check your internet connection.';
  }
  if (message.includes('Invalid login credentials')) {
    return 'Incorrect email or password. Please try again.';
  }
  if (message.includes('User already registered') || message.includes('already been registered')) {
    return 'An account with this email already exists. Please log in.';
  }
  if (
    message.includes('profiles_username_unique') ||
    (message.toLowerCase().includes('username') && message.toLowerCase().includes('duplicate'))
  ) {
    return 'That username is already taken. Please choose another one.';
  }
  if (message.includes('Database error saving new user')) {
    return 'Registration could not be completed. The username may already be taken; if another username also fails, check the Supabase profile trigger and SQL setup.';
  }
  if (message.includes('Password should be at least')) {
    return 'Password must be at least 6 characters long.';
  }
  if (message.includes('Unable to validate email')) {
    return 'Please enter a valid email address.';
  }
  if (message.includes('timeout') || message.includes('Timeout')) {
    return 'The request took too long. Please try again.';
  }

  return message || 'Something went wrong. Please try again.';
}
