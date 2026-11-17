import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import PhoneSignInScreen from '@/screens/auth/PhoneSignInScreen';
import OtpVerifyScreen from '@/screens/auth/OtpVerifyScreen';

export type AuthStackParamList = {
  PhoneSignIn: undefined;
  OtpVerify: { phoneNumber: string; e164: string };
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PhoneSignIn" component={PhoneSignInScreen} />
      <Stack.Screen name="OtpVerify" component={OtpVerifyScreen} />
    </Stack.Navigator>
  );
}
