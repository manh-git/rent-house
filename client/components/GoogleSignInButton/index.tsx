// components/GoogleSignInButton/index.tsx
import React from 'react';

interface Props {
  onSuccess: (idToken: string) => void;
  onError: (error?: any) => void;
  loading?: boolean;
}

export default function GoogleSignInButton(_props: Props) {
  return null;
}