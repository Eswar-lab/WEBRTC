// This is test app of WebRTC, using firestore to exchange information may induce pontential security risk!.

const firebaseConfig = {
   apiKey: "AIzaSyAsaV7eYS-zpNVG4Wk1nXUjQDmHKhMOiJQ",
  authDomain: "qrproject-69c75.firebaseapp.com",
  databaseURL: "https://qrproject-69c75-default-rtdb.firebaseio.com",
  projectId: "qrproject-69c75",
  storageBucket: "qrproject-69c75.appspot.com",
  messagingSenderId: "503988137670",
  appId: "1:503988137670:web:19527fd2cfe4cc6cb8f1c7",
  measurementId: "G-DGD6TG61DK"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const firestore = firebase.firestore();

const servers = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302', 'stun3.l.google.com:19302','stun4.l.google.com:19302', 'stun.ekiga.net','stun.ideasip.com','stun.rixtelecom.se','stun.schlund.de','stun.stunprotocol.org:3478','stun.voiparound.com','stun.voipbuster.com','stun.voipstunt.com','stun.voxgratia.org'],
    },
  ],
  iceCandidatePoolSize: 10,
};

// Global State
let pc = new RTCPeerConnection(servers);
let localStream = null;
let remoteStream = null;

// HTML elements
const webcamButton = document.getElementById('webcamButton');
const webcamVideo = document.getElementById('webcamVideo');
const callButton = document.getElementById('callButton');
const callInput = document.getElementById('callInput');
const answerButton = document.getElementById('answerButton');
const remoteVideo = document.getElementById('remoteVideo');
const hangupButton = document.getElementById('hangupButton');
const beforeCallControl = document.getElementById('before_call_control');
const onCallControl = document.getElementById('on_call_control');
const invitationInfo = document.getElementById('invitation_info');
const shareCode = document.getElementById('share');
const copyCode = document.getElementById('copy');


onload = () => {
  const invitation_code = new URLSearchParams(window.location.search).get('invitation_code')
  if( invitation_code != "" && invitation_code != NaN && invitation_code != null ){
    console.log(invitation_code)
    callInput.value = invitation_code
    answerButton.click()
  }
}

// 1. Setup media sources

let start_web_cam = async () => {

  localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  remoteStream = new MediaStream();

  // Push tracks from local stream to peer connection
  localStream.getTracks().forEach((track) => {
    pc.addTrack(track, localStream);
  });


  // Pull tracks from remote stream, add to video stream
  pc.ontrack = (event) => {
    event.streams[0].getTracks().forEach((track) => {
      remoteStream.addTrack(track);
    });
  };

  webcamVideo.srcObject = localStream;
  remoteVideo.srcObject = remoteStream;

  callButton.disabled = false;
  answerButton.disabled = false;
  webcamButton.disabled = true;
  
  hangupButton.disabled = false;
  beforeCallControl.classList.add('hide');
  onCallControl.classList.remove('hide');
};

// 2. Create an offer
callButton.onclick = async () => {
  await start_web_cam();
  
  // Reference Firestore collections for signaling
  const callDoc = firestore.collection('calls').doc();
  const offerCandidates = callDoc.collection('offerCandidates');
  const answerCandidates = callDoc.collection('answerCandidates');

  callInput.value = callDoc.id;
  updateInvitationInfo('Share Invitation Code');

  // Get candidates for caller, save to db
  pc.onicecandidate = (event) => {
    event.candidate && offerCandidates.add(event.candidate.toJSON());
  };

  // Create offer
  const offerDescription = await pc.createOffer();
  await pc.setLocalDescription(offerDescription);

  const offer = {
    sdp: offerDescription.sdp,
    type: offerDescription.type,
  };

  await callDoc.set({ offer });

  // Listen for remote answer
  callDoc.onSnapshot((snapshot) => {
    const data = snapshot.data();
    if (!pc.currentRemoteDescription && data?.answer) {
      const answerDescription = new RTCSessionDescription(data.answer);
      pc.setRemoteDescription(answerDescription);
    }
  });

  // When answered, add candidate to peer connection
  answerCandidates.onSnapshot((snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        const candidate = new RTCIceCandidate(change.doc.data());
        pc.addIceCandidate(candidate);
      }
    });
  });
};

// 3. Answer the call with the unique ID
answerButton.onclick = async () => {
  await start_web_cam();
  const callId = callInput.value;
  const callDoc = firestore.collection('calls').doc(callId);
  const answerCandidates = callDoc.collection('answerCandidates');
  const offerCandidates = callDoc.collection('offerCandidates');


  pc.onicecandidate = (event) => {
    event.candidate && answerCandidates.add(event.candidate.toJSON());
  };

  const callData = (await callDoc.get()).data();

  const offerDescription = callData.offer;
  await pc.setRemoteDescription(new RTCSessionDescription(offerDescription));

  const answerDescription = await pc.createAnswer();
  await pc.setLocalDescription(answerDescription);

  const answer = {
    type: answerDescription.type,
    sdp: answerDescription.sdp,
  };

  await callDoc.update({ answer });

  offerCandidates.onSnapshot((snapshot) => {
    snapshot.docChanges().forEach((change) => {
      console.log(change);
      if (change.type === 'added') {
        let data = change.doc.data();
        pc.addIceCandidate(new RTCIceCandidate(data));
      }
    });
  });
};

hangupButton.onclick = async () => { 
  await pc.close();
  window.location = window.location.href.split("?")[0]
}

let updateInvitationInfo = (message) => {
  invitationInfo.innerText = message;
}

// copyCode.onclick = () =>  {
//   var copyText = callInput
//   copyText.select();
//   copyText.setSelectionRange(0, 99999);
//   document.execCommand("copy");
// }

shareCode.onclick = () => { 
   if (navigator.share) {
    navigator.share({
      title: 'Invitation Code',
      text: `Join me on the call with this code - ${callInput.value}`,
      url: `shareCode.onclick = () => { 
   if (navigator.share) {
    navigator.share({
      title: 'Craeter Call Invitation Code',
      text: `Join me on the call with this code - ${callInput.value}`,
      url: `https://webrtc-omega-bice.vercel.app/?invitation_code=${callInput.value}`,
    })
      .then(() => console.log('Successful share'))
      .catch((error) => console.log('Error sharing', error));
  }
}?invitation_code=${callInput.value}`,
    })
      .then(() => console.log('Successful share'))
      .catch((error) => console.log('Error sharing', error));
  }
}
