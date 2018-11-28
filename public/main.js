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
  // signInButton.onclick = function() {
  //   addProcessingAppointmentsText("287");
  //   appendFileName('kelli booking 2018 2018');
  // }
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

// Create and render a Picker object
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
    gapi.load('client', function(resp) {
      downloadFile(fileId, function(xhr) {
        var data = Papa.parse(xhr.responseText, {
          header: true
        });
        console.log(data);
        showSelectedFileName(fileId);
        processAppointmentsFile(data);
      });
    });
  }
}

function processAppointmentsFile(appointmentData) {
  const countAppointments = appointmentData.data.length - 1; // first entry is header
  addProcessingAppointmentsText(countAppointments);
  let apptsByPriority = groupAppointmentsByPriority(appointmentData);
  addAppointmentsByPriorityText(apptsByPriority);
  scheduleAppointmentsByPriority(apptsByPriority);
}

function addProcessingAppointmentsText(countAppointments) {
     $('.all-container').css('margin-top', -120);
    setTimeout(function() {
      const container = $('.processing-appointments-container');
      container.append('<div>Found ' + countAppointments + ' appointments');   
      container.addClass('show');
    }, 3000);
}

function groupAppointmentsByPriority(appointmentData) {
  const apptsByPriority = new Map();
  appointmentData.data.forEach(function(datum) {
    let priority = datum.priority;
    if (!priority) {
      priority = Math.floor(Math.random() * 5);
    }
    let appointmentsForPriority = apptsByPriority.get(priority);
    if (!appointmentsForPriority) {
      appointmentsForPriority = [];
    }
    appointmentsForPriority[appointmentsForPriority.length] = datum;
    apptsByPriority.set(priority, appointmentsForPriority);
  });
  return new Map([...apptsByPriority.entries()].sort());
}

function addAppointmentsByPriorityText(apptsByPriority) {
  setTimeout(function() {
    $('.all-container').css('margin-top', -180);
    const container = $('.appointments-by-priority-container');
    apptsByPriority.forEach(function(listOfAppointments, priority) {
      container.append('<div>Priority ' + priority + ' appointments: ' + listOfAppointments.length + '</div>');   
    });
    container.addClass('show');
  }, 4000);
}

function scheduleAppointmentsByPriority(apptsByPriority) {
  addSchedulingText();
  apptsByPriority.forEach(function(applicantList, priority) {
    let shuffledAppointments = shuffle(applicantList);
  });
}

/**
 * Shuffles array in place. ES6 version
 * @param {Array} a items An array containing the items.
 */
function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function addSchedulingText() {
  setTimeout(function() {
    $('.all-container').css('margin-top', -200);
    const container = $('.scheduling-appointments-container');
    container.append('<div>Scheduling...</div>');   
    container.addClass('show');
    }, 5000);
}

/**
 * Show selected file name next to selector button
 *
 * @param {String} fileId ID of the file to show.
 */
function showSelectedFileName(fileId) {
   var accessToken = oauthToken;
  var xhr = new XMLHttpRequest();
  xhr.open('GET', 'https://www.googleapis.com/drive/v2/files/' + fileId);
  xhr.setRequestHeader('Authorization', 'Bearer ' + accessToken);
  xhr.onload = function() {
    const response = xhr.responseText;
    if (response) {
     var data = JSON.parse(response);
      appendFileName(data.title);
    }
  };
  xhr.onerror = function() {
    console.log('error getting file metadata');
  };
  xhr.send();
}

function appendFileName(name) {
  // widen container
  $('.file_selector_container').css('width', '600px');
  const selectedFileDiv = $('.selected-file-name-container');
  if (selectedFileDiv) {
    setTimeout(function () {
      selectedFileDiv.append('<div id="selected-file-name">' + name + "</div>");  
      selectedFileDiv.addClass('show');
    }, 1500);
  }
}

function downloadFile(fileId, successCallback) {
  var accessToken = oauthToken;
  var xhr = new XMLHttpRequest();
  xhr.open('GET', 'https://www.googleapis.com/drive/v2/files/' + fileId + "/export?mimeType=text/csv");
  xhr.setRequestHeader('Authorization', 'Bearer ' + accessToken);
  xhr.onload = function() {
    successCallback(xhr);
  };
  xhr.onerror = function() {
    console.log('error downloading file');
  };
  xhr.send();
}
