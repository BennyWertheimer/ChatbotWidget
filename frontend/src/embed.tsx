/**
 * Embed entry: mount ChatWidget only. Config from URL params (?apiBaseUrl=, ?workspace=, ?themeColor=, etc.)
 * or from window.__SEALX_CONFIG__ (set before script load).
 */
import React from "react";
import ReactDOM from "react-dom/client";
import { ChatWidget, type WidgetLauncherConfig } from "./ChatWidget";
import "./styles.css";

function normalizeOptional(value: string | null | undefined): string | undefined {
  const normalized = (value ?? "").trim();
  return normalized.length > 0 ? normalized : undefined;
}

function getConfig() {
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const fromWindow = typeof window !== "undefined" ? (window as unknown as { __SEALX_CONFIG__?: { apiBaseUrl?: string; workspace?: string; themeColor?: string; primaryColor?: string; launcherText?: string; greetingText?: string; avatarUrl?: string } }).__SEALX_CONFIG__ : undefined;
  const apiBaseUrl = normalizeOptional(fromWindow?.apiBaseUrl) ?? normalizeOptional(params?.get("apiBaseUrl")) ?? normalizeOptional(params?.get("api")) ?? "http://localhost:3001";
  const themeColor = normalizeOptional(fromWindow?.themeColor) ?? normalizeOptional(params?.get("themeColor")) ?? normalizeOptional(fromWindow?.primaryColor) ?? normalizeOptional(params?.get("primaryColor"));
  const launcherConfig: WidgetLauncherConfig = {
    primaryColor: themeColor,
    launcherText: normalizeOptional(fromWindow?.launcherText) ?? normalizeOptional(params?.get("launcherText")),
    greetingText: normalizeOptional(fromWindow?.greetingText) ?? normalizeOptional(params?.get("greetingText")),
    avatarUrl: normalizeOptional(fromWindow?.avatarUrl) ?? normalizeOptional(params?.get("avatarUrl")),
  };
  return { apiBaseUrl, workspace: normalizeOptional(fromWindow?.workspace) ?? normalizeOptional(params?.get("workspace")) ?? "SealX", launcherConfig };
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
