import { useEffect, useState, type ReactNode } from "react";
import type { PlatformKind } from "@/app/dependencies";
import type { AuthRepository, AuthSnapshot } from "./auth";
import { LoginScreen } from "./LoginScreen";

type SignedIn = Extract<AuthSnapshot, { status: "signedIn" }>;

export function AuthGate({
  auth,
  platform,
  children,
}: {
  auth: AuthRepository;
  platform: PlatformKind;
  children: (session: SignedIn) => ReactNode;
}) {
  const [snapshot, setSnapshot] = useState<AuthSnapshot>(auth.current());

  useEffect(() => {
    const unsubscribe = auth.subscribe(setSnapshot);
    void auth.bootstrap().then(setSnapshot);
    return unsubscribe;
  }, [auth]);

  if (snapshot.status === "checking") {
    return (
      <main className="loading-screen" role="status">
        ?명듃瑜??덉쟾?섍쾶 ?щ뒗 以묒씠?먯슂??
      </main>
    );
  }

  if (snapshot.status === "signedOut") {
    return (
      <LoginScreen
        platform={platform}
        onSignIn={(provider) => auth.signIn(provider)}
      />
    );
  }

  return (
    <>
      {snapshot.offline && (
        <div className="offline-banner" role="status">
          ?ㅽ봽?쇱씤?먯꽌????湲곌린???명듃瑜??몄쭛?????덉뼱??
        </div>
      )}
      {children(snapshot)}
    </>
  );
}
