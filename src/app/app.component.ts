import { Component, OnInit } from '@angular/core';
import { doc, Firestore, collection, addDoc, setDoc, collectionData, docData, getDoc, collectionChanges, updateDoc } from '@angular/fire/firestore';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'Peer';
  localStream!: MediaStream
  remoteStream!: MediaStream
  servers = {
    iceServers: [
      {
        urls: ['stun:stun.l.google.com:19302', 'stun:stun2.l.google.com:19302']
      },
    ],
    iceCandidatePoolSize: 10,
  }

  callRef: any;
  offerDocRef: any;
  ansdocRef: any;
  inputCall!: string;
  inputAnswer!: string;
  pc = new RTCPeerConnection(this.servers);
  constructor(private fs: Firestore) {

  }
  ngOnInit(): void {
    this.init();
  }
  async init() {
    let localvideo = <HTMLVideoElement>document.getElementById('user-Cam');
    let remoteVideo = <HTMLVideoElement>document.getElementById('user-Cam2');
    this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

    this.remoteStream = new MediaStream();
    this.localStream.getTracks().forEach((track) => {
      this.pc.addTrack(track, this.localStream);
    })
    this.pc.ontrack = ((event) => {
      event.streams[0].getTracks().forEach((track) => {
        this.remoteStream.addTrack(track);
      })
    })

    localvideo.srcObject = this.localStream;
    remoteVideo.srcObject = this.remoteStream;
  }
  async startCall() {

    this.callRef = collection(this.fs, 'calls');
    this.offerDocRef = collection(doc(this.callRef, this.inputCall), 'offerCandidates');
    this.ansdocRef = collection(doc(this.callRef, this.inputCall), 'answerCandidates');

    const offerDescription = await this.pc.createOffer();
    this.pc.onicecandidate = (event) => {

      event.candidate && addDoc(this.offerDocRef, event.candidate.toJSON());
    }
    await this.pc.setLocalDescription(offerDescription);
    const offer = {
      sdp: offerDescription.sdp,
      type: offerDescription.type,
    }
    await setDoc(doc(this.callRef, this.inputCall), { offer });
    docData(doc(this.callRef, this.inputCall)).subscribe((data: any) => {
      if (!this.pc.currentRemoteDescription && data?.answer) {
        const answerDescription = new RTCSessionDescription(data.answer);
        this.pc.setRemoteDescription(answerDescription)
      }
    })
    collectionChanges(this.ansdocRef).subscribe((data) => {
      data.forEach((doc) => {
        if (doc.type === 'added') {
          const candidate = new RTCIceCandidate(doc.doc.data());
          this.pc.addIceCandidate(candidate)
        }
      })
    })
  }
  async answerCall() {
    this.callRef = collection(this.fs, 'calls');
    this.offerDocRef = collection(doc(this.callRef, this.inputAnswer), 'offerCandidates');
    this.ansdocRef = collection(doc(this.callRef, this.inputAnswer), 'answerCandidates');
    let input = (<HTMLInputElement>document.getElementById('answerInput')).value;
    const callRef = collection(this.fs, 'calls');
    const callDoc = doc(callRef, input);
    const ansdocRef = collection(callDoc, 'answerCandidates');

    this.pc.onicecandidate = ((event) => {
      event.candidate && addDoc(ansdocRef, event.candidate.toJSON());
    })
    const callData = (await getDoc(callDoc)).data();

    const offerDescription = callData!['offer'];
    await this.pc.setRemoteDescription(new RTCSessionDescription(offerDescription))

    const answerDescription = await this.pc.createAnswer();

    await this.pc.setLocalDescription(answerDescription);

    const answer = {
      sdp: answerDescription.sdp,
      type: answerDescription.type
    }
    updateDoc(callDoc, { answer });
    collectionChanges(this.offerDocRef).subscribe((data) => {
      data.forEach((doc) => {
        if (doc.type === 'added') {
          let data = doc.doc.data();
          this.pc.addIceCandidate(new RTCIceCandidate(data));
        }
      })
    })
  }

  turnWebCam() {
    this.localStream.getVideoTracks().forEach((track) => {
      track.enabled = !track.enabled;
    })
  }
  turnMic() {
    this.localStream.getAudioTracks().forEach((track) => {
      track.enabled = !track.enabled;
    })
  }
}
