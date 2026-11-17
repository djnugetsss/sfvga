/* global firebase */
// The public Firebase client configuration is generated from environment
// variables at build time. No project key is stored in this source file.
try {
  importScripts('/firebase-messaging-config.js');
} catch {
  // Local previews do not configure web push.
}

if (self.SFVGA_FIREBASE_CONFIG) {
  importScripts('https://www.gstatic.com/firebasejs/11.0.2/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/11.0.2/firebase-messaging-compat.js');
  firebase.initializeApp(self.SFVGA_FIREBASE_CONFIG);
  firebase.messaging();
}
