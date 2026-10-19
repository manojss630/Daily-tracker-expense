import { Redirect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export default function IndexRoute() {
  const { loading, session } = useAuth();
  if (loading) return null;
  return <Redirect href={session ? '/(tabs)' : '/login'} />;
}
