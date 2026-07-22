import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "@/app/App";
import { attachOAuthCallback, createRuntimeDependencies } from "@/app/runtime";
import "@/app/styles.css";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Orosi root element is missing");
const root = createRoot(rootElement);

try {
  const dependencies = createRuntimeDependencies();
  void attachOAuthCallback(dependencies);
  root.render(
    <StrictMode>
      <App dependencies={dependencies} />
    </StrictMode>,
  );
} catch {
  root.render(
    <main className="configuration-error">
      <h1>???ㅼ젙???뺤씤??二쇱꽭??</h1>
      <p>濡쒓렇???곌껐 ?뺣낫媛 ?꾩쭅 ??鍮뚮뱶???ㅼ젙?섏? ?딆븯?댁슂.</p>
    </main>,
  );
}
