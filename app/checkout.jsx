import { useEffect } from 'react';
import { router } from 'expo-router';
import { View } from 'react-native';

export default function CheckoutScreen() {
  useEffect(() => {
    router.replace('/(drawer)/subscription');
  }, []);

  return <View />;
}
