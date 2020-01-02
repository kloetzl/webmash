/* SPDX-License-Identifier: GPL-3.0-or-later */

importScripts('hash.js', 'sketch.js');

var GLOBALS = {};

onmessage = function (msg) {
  var handlers = {
    'init' : handleInit,
    'read' : handleRead,
    'ping' : function (payload) {
      self.postMessage({type: 'ping', payload: payload});
    }
  };

  if (msg.data.type in handlers) {
    handlers[msg.data.type](msg.data.payload);
  } else {
    console.error('couldnt parse message', msg);
  }
};

function handleInit(msg) {
  GLOBALS = msg.GLOBALS;
  console.log('init done');
}

function handleRead (file) {
  var reader = new FileReader();

  reader.onerror = console.error;
  reader.onprogress = function updateProgress(evt) {
    // todo: send progress update
    // // evt is an ProgressEvent.
    // if (evt.lengthComputable) {
    //   var percentLoaded = Math.round((evt.loaded / evt.total) * 100);
    //   // Increase the progress bar length.
    //   if (percentLoaded < 100) {
    //     progress_bar.style.width = percentLoaded + '%';
    //     progress_bar.textContent = percentLoaded + '%';
    //   }
    // }
  };

  reader.onabort = function(e) {
    // todo: huh?
  };

  reader.onloadstart = function(e) {
    // todo: send progress update
  };

  reader.onload = function(e) {
    // todo: send progress update

    var s = sketchFile(reader.result, function (amount){
      postMessage({type: 'progress', payload: amount});
    });
    postMessage({type:'sketch', payload: s.pairs()});
  };

  // reader.readAsBinaryString(evt.target.files[0]);
  reader.readAsText(file);
}
