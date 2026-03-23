/**
 * HTML shown when the browser hits this MCP server's /oauth/callback.
 * That almost always means redirect_uri used the MCP port (wrong) instead of mcp-remote's callback port.
 */
export function oauthCallbackWrongServerHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><title>OAuth callback — wrong port</title></head>
<body style="font-family:system-ui,sans-serif;max-width:42rem;margin:2rem;line-height:1.5">
<h1>OAuth callback hit the CMMS MCP server</h1>
<p>
  <code>/oauth/callback</code> is handled by <strong>mcp-remote</strong> on a <strong>different</strong> local port,
  not by this MCP HTTP app. Supabase sent your browser here because the registered
  <code>redirect_uri</code> pointed at this server’s port (often the same port as <code>/mcp</code>),
  or you are using <code>response_mode=form_post</code> and the wrong listener received the POST.
</p>
<h2>Fix (Cursor)</h2>
<ol>
  <li>In <code>mcp.json</code>, pass a <strong>dedicated OAuth callback port</strong> as the third argument
    (must <strong>not</strong> equal the MCP server port), e.g. <code>9876</code>, plus
    <code>--host</code> <code>127.0.0.1</code> so it matches your redirect URL.</li>
  <li>Remove stale OAuth client files under <code>~/.mcp-auth/mcp-remote-*/*_client_info.json</code>
    if mcp-remote keeps reusing a bad <code>redirect_uri</code>, then reload the MCP server in Cursor.</li>
  <li>Watch mcp-remote logs for: <code>OAuth callback server running at http://127.0.0.1:…</code>
    — that port must match registration.</li>
</ol>
<p>See <code>mcp-remote</code> README: optional callback port argument after the server URL.</p>
</body></html>`;
}
