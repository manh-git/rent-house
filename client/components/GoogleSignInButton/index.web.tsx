import React from 'react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

const CLIENT_ID = '309568191271-egevp7ib9h1uel436i3cp6liek6ju1c8.apps.googleusercontent.com';

interface Props {
  onSuccess: (idToken: string) => void;
  onError: (error?: any) => void;
  loading?: boolean;
}

export default function GoogleSignInButton({ onSuccess, onError }: Props) {
  return (
    <GoogleOAuthProvider clientId={CLIENT_ID}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
        <GoogleLogin
          
          onSuccess={(credentialResponse) => {
            console.log("Google Raw Response:", credentialResponse);
            if (credentialResponse.credential) {
              onSuccess(credentialResponse.credential);
            }
            else {
      console.error("No credential returned from Google");
      onError();}
          }}
          onError={() => onError()}
          useOneTap={false}
        />
      </div>
    </GoogleOAuthProvider>
  );
}