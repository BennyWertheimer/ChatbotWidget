/**
 * Embed entry: mount ChatWidget only. Config from URL params (?apiBaseUrl=, ?workspace=, ?themeColor=, etc.)
 * or from window.__SEALX_CONFIG__ (set before script load).
 */
import React from "react";
import ReactDOM from "react-dom/client";
import { ChatWidget, type WidgetLauncherConfig } from "./ChatWidget";
import "./styles.css";

function getConfig() {
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const fromWindow = typeof window !== "undefined" ? (window as unknown as { __SEALX_CONFIG__?: { apiBaseUrl?: string; workspace?: string; themeColor?: string; primaryColor?: string; launcherText?: string; greetingText?: string; avatarUrl?: string } }).__SEALX_CONFIG__ : undefined;
  const apiBaseUrl = fromWindow?.apiBaseUrl ?? params?.get("apiBaseUrl") ?? params?.get("api") ?? "http://localhost:3001";
  const themeColor = fromWindow?.themeColor ?? params?.get("themeColor") ?? fromWindow?.primaryColor ?? params?.get("primaryColor") ?? undefined;
  const launcherConfig: WidgetLauncherConfig = {
    primaryColor: themeColor ?? undefined,
    launcherText: fromWindow?.launcherText ?? params?.get("launcherText") ?? undefined,
    greetingText: fromWindow?.greetingText ?? params?.get("greetingText") ?? undefined,
    avatarUrl: fromWindow?.avatarUrl ?? params?.get("avatarUrl") ?? undefined,
  };
  return { apiBaseUrl, workspace: fromWindow?.workspace ?? params?.get("workspace") ?? "SealX", launcherConfig };
}

const config = getConfig();
if (typeof window !== "undefined") window.__SEALX_API_BASE__ = config.apiBaseUrl;

const root = document.getElementById("sealx-chat-root");
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <ChatWidget launcherConfig={config.launcherConfig} />
    </React.StrictMode>
  );
}
