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

var scheduledAppointmentsGLOBAL = null;

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
  let scheduledAppointments = scheduleAppointmentsByPriority(apptsByPriority);
  showFollowupOptions(scheduledAppointments);
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
      datum.priority = priority;
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
      container.append(
        '<div class="priority-' + priority + '-container priority-container">' +
          '<div class="priority-' + priority + '-appointments">' + 
            'Priority ' + priority + ' appointments: ' + listOfAppointments.length + 
          '</div>' + 
        '</div>');
    });
    container.addClass('show');
  }, 4000);
}

function scheduleAppointmentsByPriority(apptsByPriority) {
  addSchedulingText();
  const scheduledAppointments = new Map();
  let slots = [];
  let firstApplicant = apptsByPriority.get(0)[0];
  for (var cellHeader in firstApplicant) {
    if (firstApplicant.hasOwnProperty(cellHeader) && cellHeader.includes('please check off all')) {
      slots[slots.length] = cellHeader;
    }
  }

  apptsByPriority.forEach(function(applicantList, priority) {
    let shuffledAppointments = shuffle(applicantList);
    const availabilities = new Map();
    shuffledAppointments.forEach(function(applicant) {
      for (var cellHeader in applicant) {
        if (applicant.hasOwnProperty(cellHeader) 
          && cellHeader.includes('please check off all')
          && applicant[cellHeader] !== ""
          && !scheduledAppointments.get(cellHeader)) {
          // add applicant as available for this time
          let prevAvailabilities = availabilities.get(cellHeader);
          if (!prevAvailabilities) {
            prevAvailabilities = [];
          }
          prevAvailabilities[prevAvailabilities.length] = applicant;
          availabilities.set(cellHeader, prevAvailabilities);
        }
      }
    });
    while (availabilities.size > 0) {
      // availabilities contains all submission ids available for each time slot
      // sort according to how many people are available for each slot, ascending
      let sortedAvailabilities =
        Array
          .from(availabilities)
          .sort((a, b) => {
            // a[0], b[0] is the key of the map
            return a[1].length - b[1].length;
          });
      // get first (least people available) slot
      let slot = sortedAvailabilities[0][0]; // time of slot, as a string

      // if slot doesn't have any people that are available for it, get rid of it
      if (sortedAvailabilities[0][1].length === 0) {
        availabilities.delete(slot);
        continue;
      }

      let availabilitiesForSlot = 
        sortedAvailabilities[0][1] // get first tuple, then get values (applicants)
          .sort((a, b) => {
            // sort by earliest submission
            if (a['Submission Date'] > b['Submission Date']) {
              return 1;
            } else {
              return -1;
            }
          });
      // availabilities are sorted according to submission date and time
      let chosenAppointment = availabilitiesForSlot[0];

      // for this slot, pick the  highest priority person who applied the earliest
      scheduledAppointments.set(slot, chosenAppointment);

      // remove slot from list, as it has now been filled
      availabilities.delete(slot);

      // remove person from the remaining list of applicants
      availabilities.forEach(function(applicants, slot) {
        let foundApplicant = false;
        let indexInApplicantsList = 0;
        while (!foundApplicant && indexInApplicantsList < applicants.length) {
          if (applicants[indexInApplicantsList]['Submission ID'] === chosenAppointment['Submission ID']) {
            applicants.splice(indexInApplicantsList, 1);
            foundApplicant = true;
          }
          indexInApplicantsList++;
        }
      });
    }
  });

  // after scheduling is complete, count how many we were able to schedule
  let countPrioritiesScheduled = new Map();
  scheduledAppointments.forEach(function(appointment, slot) {
    let count = countPrioritiesScheduled.get(appointment.priority);
    if (!count) {
      count = 0;
    }
    count++;
    countPrioritiesScheduled.set(appointment.priority, count);
  });

  setTimeout(function() {
    countPrioritiesScheduled.forEach(function(count, priority) {
      let elem = $('.priority-' + priority + '-container');
       elem.append('     <div class="start-hidden priority-scheduled">' + count + ' scheduled</div>');
      });
  }, 6000);

  setTimeout(function() {
    $('.priority-scheduled').addClass('show');
    $('.scheduling-appointments-container-done').text('Done').addClass('show');
  }, 6500);

  return scheduledAppointments;
}

function showFollowupOptions(scheduledAppointments) {
  setTimeout(function() {
    $('.all-container').css('margin-top', -220);
    $('.followups').css('display', 'flex');

    // add click handlers to followup buttons
    // var downloadFunction = downloadResultsPDF.bind(this, scheduledAppointments);
    scheduledAppointmentsGLOBAL = scheduledAppointments;
    let downloadFunction = downloadResultsPDF.bind(this, scheduledAppointments);
    let pdfButton = $('#export-pdf-button');
    pdfButton.click(downloadFunction);
  }, 7000);
  setTimeout(function() {
    $('.followups').addClass('show');
  }, 8000)
}

function downloadResultsPDF(scheduledAppointments) {
    let doc = new jsPDF();
    doc.setFont('courier');

    // add header
    doc.setFontSize(18);
    doc.setTextColor(42, 42, 42);
    doc.text('Scheduled Appointments', 10, 20);
    doc.line(10, 25, 100, 25);

    let pos = 0;
    let countAppointmentsDisplayed = 0;
    scheduledAppointments.forEach(function(appointment, slot) {
      if (countAppointmentsDisplayed !== 0 && countAppointmentsDisplayed % 3 === 0) {
        doc.addPage();
        pos = 0;
      }
      let beginningOfSectionPos = 35 + pos * 5; 

      // info about time slot
      let slotSplit = slot.split(">>");
      let slotReadable = slotSplit[1] + ": " + slotSplit[2];
      doc.setFontSize(12);
      doc.setFontStyle('bold');
      doc.setTextColor(42, 42, 42);
      doc.text(slotReadable, 10, beginningOfSectionPos);

      // info about appointment
      doc.setFontSize(10);
      doc.setFontStyle('normal');
      doc.text('FirstName LastName', 12, beginningOfSectionPos + 5);
      doc.text(appointment['Submission ID'], 12, beginningOfSectionPos + 10);

      // comments on appointment
      let comments = appointment['ILLUSTRATIVE TATTOOS (Collection or Custom)- What would you like tattooed?'];
      let commentsArray = [];
      let index = 0;
      while (comments.length > 0) {
        commentsArray[index] = comments.substring(0, 90);
        comments = comments.substring(90);
        index++;
      }
      // if comments are too long, truncate
      if (commentsArray.length > 10) {
        let lastComment = commentsArray[commentsArray.length - 1];
        commentsArray = commentsArray.slice(0, 10);
        commentsArray[10] = '...(comments truncated during export)...';
        commentsArray[11] = lastComment;
      }
      // append comment
      doc.text(commentsArray, 12, beginningOfSectionPos + 15)

      // move pointer to accomodate length of section and length of commenta
      pos+=(5 + commentsArray.length);

      // increment this so we know when to start a new PDF page
      countAppointmentsDisplayed++;
    });
    doc.save('test_jsPDF.pdf');
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
    container.append('<div class="scheduling">Scheduling...</div>');   
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
