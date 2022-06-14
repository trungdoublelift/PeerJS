import { Component, OnInit } from '@angular/core';
import { Peer } from "peerjs";
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'Peer';
  localStream!: MediaStream
  remoteStream!: MediaStream
  ngOnInit(): void {

    this.init();
  }
  peer = new Peer(Math.floor(Math.random() * 100000).toString());
  async init() {
    console.log(this.peer)
    let video = <HTMLVideoElement>document.getElementById('user-Cam')
    this.localStream = await navigator.mediaDevices.getUserMedia(
      { video: false, audio: true })
    video.srcObject = this.localStream;
    video.style.backgroundColor = "black";
    this.peer.on("connection", (conn) => {
      conn.on("data", (data) => {
        // Will print 'hi!'
        console.log(data);
      });

    });
    this.peer.on("call", async (call) => {
      this.remoteStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true })
      call.answer(this.remoteStream); // Answer the call with an A/V stream.
      call.on("stream", (remoteStream) => {
        let video = <HTMLVideoElement>document.getElementById('user-Cam2')
        video.srcObject = remoteStream;
        video.style.backgroundColor = "black";
      });
    },

    )
  }
  getOffer() {
    console.log((<HTMLInputElement>document.getElementById('PeerInput')).value)
    let conn = this.peer.connect((<HTMLInputElement>document.getElementById('PeerInput')).value);
    conn.on("open", () => {
      conn.send("hi!");
    });
  }
  getAnswer() {
    let conn = this.peer.connect((<HTMLInputElement>document.getElementById('PeerInput')).value);
    conn.on("open", () => {
      conn.send((<HTMLInputElement>document.getElementById('Message')).value);
    });
  }
  startCall() {
    let call = this.peer.call((<HTMLInputElement>document.getElementById('PeerInput')).value, this.localStream);
    call.on("stream", (remoteStream) => {
      let video = <HTMLVideoElement>document.getElementById('user-Cam2')
      video.srcObject = remoteStream;
      video.style.backgroundColor = "black";
      // Show stream in some <video> element.
    });
  }
}
