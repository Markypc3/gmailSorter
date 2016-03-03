// Your Client ID can be retrieved from your project in the Google
// Developer Console, https://console.developers.google.com


var unsortedMessages = [];
var acceptedMessages = [];
var rejectedMessages = [];

/**
 * Check if current user has authorized this application.
 */
function checkAuth() {
  gapi.auth.authorize(
    {
      'client_id': CLIENT_ID,
      'scope': SCOPES.join(' '),
      'immediate': true
    }, handleAuthResult);
}

/**
 * Handle response from authorization server.
 *
 * @param {Object} authResult Authorization result.
 */
function handleAuthResult(authResult) {
  var authorizeDiv = document.getElementById('authorize-div');
  var containerDiv = document.getElementById('container');
  if (authResult && !authResult.error) {
    // Hide auth UI, then load client library.
    authorizeDiv.style.display = 'none';
    loadGmailApi();
    containerDiv.style.display = 'block';
  } else {
    // Show auth UI, allowing the user to initiate authorization by
    // clicking authorize button.
    authorizeDiv.style.display = 'inline';
    containerDiv.style.display = 'none';
  }
}

/**
 * Initiate auth flow in response to user clicking authorize button.
 *
 * @param {Event} event Button click event.
 */
function handleAuthClick(event) {
  gapi.auth.authorize(
    {client_id: CLIENT_ID, scope: SCOPES, immediate: false},
    handleAuthResult);
  return false;
}

/**
 * Load Gmail API client library. List labels once client library
 * is loaded.
 */
function loadGmailApi() {
  gapi.client.load('gmail', 'v1', listMessages);
}

/**
 * Print all Labels in the authorized user's inbox. If no labels
 * are found an appropriate message is printed.
 */
function listLabels() {
  var request = gapi.client.gmail.users.labels.list({
    'userId': 'me'
  });

  request.execute(function(resp) {
    var labels = resp.labels;
    appendPre('Labels:');

    if (labels && labels.length > 0) {
      for (i = 0; i < labels.length; i++) {
        var label = labels[i];
        appendPre(label.name)
      }
    } else {
      appendPre('No Labels found.');
    }
  });
}

/**
 * Append a pre element to the body containing the given message
 * as its text node.
 *
 * @param {string} message Text to be placed in pre element.
 */
function appendPre(message) {
  var pre = document.getElementById('output');
  var textContent = document.createTextNode(message + '\n');
  pre.appendChild(textContent);
}

var cacheNewMessages = function(messages) {
  console.log(messages);
  console.log(document);
  if (messages.length != 0) {
    for (var i = 0; i < messages.length; i++) {
      if (!messageWasProcessed(messages[i])) {
        unsortedMessages.push(messages[i]);
      }
    }
    showMessages('unsorted');
  }
}

/**
 * Retrieve Messages in user's mailbox matching query.
 *
 * @param  {String} userId User's email address. The special value 'me'
 * can be used to indicate the authenticated user.
 * @param  {String} query String used to filter the Messages listed.
 * @param  {Function} callback Function to call when the request is complete.
 */
function listMessages(userId) {
  userId = 'me';
  var getPageOfMessages = function(request, result) {
    console.log(userId);
    request.execute(function(resp) {
      result = result.concat(resp.messages);
      var nextPageToken = resp.nextPageToken;
      console.log(resp);
      // if (nextPageToken) {
      //   request = gapi.client.gmail.users.messages.list({
      //     'userId': userId,
      //     'pageToken': nextPageToken
      //   });
      //   getPageOfMessages(request, result);
      // } else {
        cacheNewMessages(result);
      // }
    });
  };
  var initialRequest = gapi.client.gmail.users.messages.list({
    'userId': userId
  });
  getPageOfMessages(initialRequest, []);
}
function messageWasProcessed(message) {
  if (unsortedMessages.indexOf(message) > -1 ||
      acceptedMessages.indexOf(message) > -1 ||
      rejectedMessages.indexOf(message) > -1
      ) {
    return true;
  }
  return false;
}
function getSelectedMessage() {
  var messageList = document.getElementById('messageList');
  var activeMessages = messageList.getElementsByClassName('active');
  return activeMessages[0];
}
function getMessageIdObject(message) {
  var pane = getSelectedPane();
  var array = getArray(pane);
  for (var i = 0; i < array.length; i++) {
    if(array[i].id == message.id){
      return array[i];
    }
  }
}
function acceptMessage(paneName) {
  var selectedMessage = getSelectedMessage();
  var message = getMessageIdObject(selectedMessage);
  if (message && messageWasProcessed(message)) {
    if (unsortedMessages.indexOf(message) > -1) {
      unsortedMessages.splice(unsortedMessages.indexOf(message), 1);
    }
    else if (rejectedMessages.indexOf(message) > -1) {
      rejectedMessages.splice(rejectedMessages.indexOf(message), 1);
    }
    else if (acceptedMessages.indexOf(message) > -1) {
      return;
    }
    acceptedMessages.push(message);
    selectedMessage.outerHTML = "";
    //sortMessageOrder('accepted'); This doesn't currently work because stored messages are just id and thread id, so we haven't stored metadata yet
  }
}
function rejectMessage(message) {
  var selectedMessage = getSelectedMessage();
  var message = getMessageIdObject(selectedMessage);
  if (message && messageWasProcessed(message)) {
    if (unsortedMessages.indexOf(message) > -1) {
      unsortedMessages.splice(unsortedMessages.indexOf(message), 1);
    }
    else if (acceptedMessages.indexOf(message) > -1) {
      acceptedMessages.splice(acceptedMessages.indexOf(message), 1);
    }
    else if (rejectedMessages.indexOf(message) > -1) {
      return;
    }
    rejectedMessages.push(message);
    selectedMessage.outerHTML = "";
    // sortMessageOrder('rejected');
  }
}
function unsortMessage(message) {
  var selectedMessage = getSelectedMessage();
  var message = getMessageIdObject(selectedMessage);
  if (message && messageWasProcessed(message)) {
    if (rejectedMessages.indexOf(message) > -1) {
      rejectedMessages.splice(rejectedMessages.indexOf(message), 1);
    }
    else if (acceptedMessages.indexOf(message) > -1) {
      acceptedMessages.splice(acceptedMessages.indexOf(message), 1);
    }
    else if (unsortedMessages.indexOf(message) > -1) {
      return;
    }
    unsortedMessages.push(message);
    selectedMessage.outerHTML = "";
    // sortMessageOrder('unsorted');
  }
}
function sortMessageOrder(paneName) {
  var toSort = getArray(paneName);
  toSort.sort(function(a,b){
    return b.internalDate - a.internalDate;
  });
}
function getArray(paneName) {
  switch (paneName) {
    case 'unsorted':
      return unsortedMessages;
      break;
    case 'accepted':
      return acceptedMessages;
      break;
    case 'rejected':
      return rejectedMessages;
      break;
    default:
      return null;
  }
}
/**
 * Get Message with given ID.
 *
 * @param  {String} userId User's email address. The special value 'me'
 * can be used to indicate the authenticated user.
 * @param  {String} messageId ID of Message to get.
 * @param  {Function} callback Function to call when the request is complete.
 */
function getMessage(userId, messageId, callback) {
  var request = gapi.client.gmail.users.messages.get({
    'userId': userId,
    'id': messageId
  });
  request.execute(callback);
}
function messageClicked(id) {
  var messageList = document.getElementById('messageList');
  var currentMessage = messageList.getElementsByClassName('active');
  for (var i = 0; i < currentMessage.length; i++) {
    currentMessage[i].className = 'list-group-item';
  }
  var newlyActiveMessage = document.getElementById(id);
  newlyActiveMessage.className = 'list-group-item active';
}

function createMessageElement(message){
  console.log(message);
  var element = document.createElement('a');
  element.setAttribute('href', '#');
  element.setAttribute('onclick', 'messageClicked("' + message.id + '")')
  element.id = message.id;
  element.className = "list-group-item";
  var messageSubject = document.createElement('h4');
  messageSubject.className = 'list-group-item-heading';
  var messageBody = document.createElement('p');
  messageBody.className = 'list-group-item-text';
  for (var i = 0; i < message.payload.headers.length; i++) {
    if(message.payload.headers[i].name.toLowerCase() == 'subject'){
      messageSubject.innerHTML = message.payload.headers[i].value;
    }
  }
  messageBody.innerHTML = message.snippet;
  element.appendChild(messageSubject);
  element.appendChild(messageBody);
  console.log('In createMessageElement');
  console.log(element);
  appendMessageToList(element);
}
function getMessageElement(message) {
  getMessage('me', message.id, createMessageElement);
}
function appendMessageToList(element) {
  var list = document.getElementById('messageList');
  list.appendChild(element);
}
function showMessages(paneName) {
  var displayArray = getArray(paneName);
  console.log('showMessages called on ' + paneName + 'pane');
  console.log(displayArray);
  for (var i = 0; i < displayArray.length; ++i) {
    getMessageElement(displayArray[i]);
  }
}
function getSelectedPane() {
  var paneSelect = document.getElementById('paneSelect');
  var activePanes = paneSelect.getElementsByClassName('active');
  return activePanes[0].id;
}
function getSelectedPaneElement() {
  var paneSelect = document.getElementById('paneSelect');
  var activePanes = paneSelect.getElementsByClassName('active');
  return activePanes[0];
}
function clearMessageList() {
  document.getElementById('messageList').innerHTML = "";
}
function switchToPane(paneName) {
  if (['unsorted','accepted','rejected'].indexOf(paneName) > -1) {
    var currentPane = getSelectedPane();
    currentPane.className = "";
    document.getElementById(paneName).className = "active";
    clearMessageList();
    showMessages(paneName);
  }
}
function pageMessages() {
  listMessages('me',cacheNewMessages);
}
