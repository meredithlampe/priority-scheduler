var signInButton = document.getElementById('select-appointments-file-button');
var authorizeButton = signInButton;

// The Browser API key obtained from the Google API Console.
// Replace with your own Browser API key, or your own key.
var developerKey = 'AIzaSyCfrRxOfqgvnKFZWENKzll9EaOG30s0nR0';

// The Client ID obtained from the Google API Console. Replace with your own Client ID.
var clientId = '13815235412-pav2j6fbeqmltoa7r6vtuq7es6edmpb9.apps.googleusercontent.com';

// Replace with your own project number from console.developers.google.com.
// See "Project number" under "IAM & Admin" > "Settings"
var appId = '13815235412';


// Scope to use to access user's Drive items.
var scope = ['https://www.googleapis.com/auth/drive'];

var pickerApiLoaded = false;
var oauthToken;

function showSelectAppointmentsFileButton() {
  signInButton.visibility = "visible";
  signInButton.onclick = loadPicker;
}

// Use the Google API Loader script to load the google.picker script.
function loadPicker() {
  gapi.load('auth', {'callback': onAuthApiLoad});
  gapi.load('picker', {'callback': onPickerApiLoad});
}

function onAuthApiLoad() {
  window.gapi.auth.authorize(
      {
        'client_id': clientId,
        'scope': scope,
        'immediate': false
      },
      handleAuthResult);
}

function onPickerApiLoad() {
  pickerApiLoaded = true;
  createPicker();
}

function handleAuthResult(authResult) {
  if (authResult && !authResult.error) {
    oauthToken = authResult.access_token;
    createPicker();
  }
}

// Create and render a Picker object for searching images.
function createPicker() {
  if (pickerApiLoaded && oauthToken) {
    var view = new google.picker.View(google.picker.ViewId.DOCS);
    view.setMimeTypes("application/vnd.google-apps.spreadsheet");
    var picker = new google.picker.PickerBuilder()
        // .enableFeature(google.picker.Feature.NAV_HIDDEN)
        // .enableFeature(google.picker.Feature.MULTISELECT_ENABLED)
        .setAppId(appId)
        .setOAuthToken(oauthToken)
        .addView(view)
        .addView(new google.picker.DocsUploadView())
        .setDeveloperKey(developerKey)
        .setCallback(pickerCallback)
        .build();
     picker.setVisible(true);
  }
}

// A simple callback implementation.
function pickerCallback(data) {
  if (data.action == google.picker.Action.PICKED) {
    var fileId = data.docs[0].id;
    alert('The user selected: ' + fileId);
  }
}