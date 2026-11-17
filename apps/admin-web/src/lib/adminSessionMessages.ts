export function isTrustedAdminSessionMessage(
  event: Pick<MessageEvent, 'source' | 'origin'>,
  parentWindow: Window,
  currentWindow: Window,
  memberOrigins: readonly string[],
  hasNativeBridge: boolean,
): boolean {
  // react-native-webview on iOS dispatches a MessageEvent on window with
  // no source or origin when native code calls WebView.postMessage().
  if (hasNativeBridge && event.source === null && event.origin === '') return true;

  return (
    parentWindow !== currentWindow &&
    event.source === parentWindow &&
    memberOrigins.includes(event.origin)
  );
}
