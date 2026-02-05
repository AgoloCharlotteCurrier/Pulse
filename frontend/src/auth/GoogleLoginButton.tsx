import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "./AuthProvider";
import { useState } from "react";

export default function GoogleLoginButton() {
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <GoogleLogin
        onSuccess={async (resp) => {
          setError(null);
          try {
            await login(resp.credential!);
          } catch (e: any) {
            setError(e.response?.data?.detail || "Login failed");
          }
        }}
        onError={() => setError("Google Sign-In failed")}
      />
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
