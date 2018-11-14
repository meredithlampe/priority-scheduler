var signInButton = document.getElementById('sign-in-button');
var signOutButton = document.getElementById('sign-out-button');

function onAuthStateChanged(user) {}

// Bindings on load.
window.addEventListener('load', function() {
    // Initialize Firebase
  var config = {
    apiKey: "AIzaSyCroalNVFR1PJnYE0ehKP__7pypNdPvLw0",
    authDomain: "priority-scheduler.firebaseapp.com",
    databaseURL: "https://priority-scheduler.firebaseio.com",
    projectId: "priority-scheduler",
    storageBucket: "",
    messagingSenderId: "56053464303"
  };
  firebase.initializeApp(config);
  // Bind Sign in button.
  signInButton.addEventListener('click', function() {
    var provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider);
  });

  // Bind Sign out button.
  // signOutButton.addEventListener('click', function() {
  //   firebase.auth().signOut();
  // });

  // Listen for auth state changes
  firebase.auth().onAuthStateChanged(onAuthStateChanged);
});