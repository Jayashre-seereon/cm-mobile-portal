import { Redirect, useLocalSearchParams } from 'expo-router';

export default function ResetPasswordTokenRoute() {
  const params = useLocalSearchParams();
  const token = String(params.token || '').trim();

  return (
    <Redirect
      href={{
        pathname: '/reset-password',
        params: token ? { token } : {},
      }}
    />
  );
}
