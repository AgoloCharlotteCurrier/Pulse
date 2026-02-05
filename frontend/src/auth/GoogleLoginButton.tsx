import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "./AuthProvider";
import { useState } from "react";

export default function GoogleLoginButton() {
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <GoogleLogin
        onSuccess={async (credentialResponse) => {
          setError(null);
          try {
            if (credentialResponse.credential) {
              await login(credentialResponse.credential);
            } else {
              setError("No credential returned from Google");
            }
          } catch (e: any) {
            setError(e.response?.data?.detail || "Login failed");
          }
        }}
        onError={() => setError("Google Sign-In failed")}
        theme="outline"
        size="large"
        text="signin_with"
      />
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
